import hashlib
import time
import uuid
from datetime import datetime, timedelta, timezone
from threading import RLock
from types import SimpleNamespace

from app.database import supabase as supabase_database
from app.identity.sessions import PostgresSessionStore, Session


class SharedSessionDatabase:
    def __init__(self):
        self.rows: dict[str, dict] = {}
        self.lock = RLock()

    def table(self, name: str):
        assert name == "backend_sessions"
        return SessionTableQuery(self)

    def rpc(self, name: str, params: dict):
        return SessionLockQuery(self, name, params)


class SessionTableQuery:
    def __init__(self, database: SharedSessionDatabase):
        self.database = database
        self.operation = ""
        self.payload: dict | None = None
        self.filters: list[tuple[str, str, object]] = []

    def select(self, _columns: str):
        self.operation = "select"
        return self

    def insert(self, payload: dict):
        self.operation = "insert"
        self.payload = payload
        return self

    def update(self, payload: dict):
        self.operation = "update"
        self.payload = payload
        return self

    def delete(self):
        self.operation = "delete"
        return self

    def eq(self, column: str, value: object):
        self.filters.append(("eq", column, value))
        return self

    def lte(self, column: str, value: object):
        self.filters.append(("lte", column, value))
        return self

    def maybe_single(self):
        return self

    def execute(self):
        with self.database.lock:
            if self.operation == "insert":
                assert self.payload is not None
                self.database.rows[self.payload["session_hash"]] = dict(self.payload)
                return SimpleNamespace(data=[self.payload])

            matching = [
                (key, row) for key, row in self.database.rows.items()
                if self._matches(row)
            ]
            if self.operation == "select":
                return SimpleNamespace(data=dict(matching[0][1]) if matching else None)
            if self.operation == "update":
                assert self.payload is not None
                for _, row in matching:
                    row.update(self.payload)
                return SimpleNamespace(data=None)
            if self.operation == "delete":
                for key, _ in matching:
                    del self.database.rows[key]
                return SimpleNamespace(data=None)
            raise AssertionError(f"Unexpected operation: {self.operation}")

    def _matches(self, row: dict) -> bool:
        for operation, column, value in self.filters:
            if operation == "eq" and row.get(column) != value:
                return False
            if operation == "lte" and row.get(column, "") > value:
                return False
        return True


class SessionLockQuery:
    def __init__(self, database: SharedSessionDatabase, name: str, params: dict):
        self.database = database
        self.name = name
        self.params = params

    def execute(self):
        with self.database.lock:
            row = self.database.rows.get(self.params["p_session_hash"])
            if not row:
                return SimpleNamespace(data=False)
            now = datetime.now(timezone.utc)
            if self.name == "acquire_backend_session_lock":
                expires_at = datetime.fromisoformat(row["expires_at"])
                lock_expires_at = row.get("lock_expires_at")
                if expires_at <= now or (
                    lock_expires_at is not None
                    and datetime.fromisoformat(lock_expires_at) > now
                ):
                    return SimpleNamespace(data=False)
                row["lock_id"] = self.params["p_lock_id"]
                row["lock_expires_at"] = (
                    now + timedelta(seconds=self.params["p_lock_seconds"])
                ).isoformat()
                return SimpleNamespace(data=True)
            if self.name == "release_backend_session_lock":
                if row.get("lock_id") != self.params["p_lock_id"]:
                    return SimpleNamespace(data=False)
                row["lock_id"] = None
                row["lock_expires_at"] = None
                return SimpleNamespace(data=True)
            raise AssertionError(f"Unexpected RPC: {self.name}")


def test_postgres_session_store_is_shared_and_serializes_refresh():
    database = SharedSessionDatabase()
    first_instance = PostgresSessionStore(database)
    second_instance = PostgresSessionStore(database)

    session_id = first_instance.add(Session(
        "student-id", "access", "refresh", time.time() + 3600, time.time() + 3600,
    ))
    stored_hash = hashlib.sha256(session_id.encode("utf-8")).hexdigest()
    assert stored_hash in database.rows
    assert session_id not in database.rows
    assert second_instance.get(session_id).refresh_token == "refresh"

    with first_instance.locked(session_id) as session:
        assert session is not None
        assert not second_instance._acquire_lock(stored_hash, str(uuid.uuid4()))
        session.access_token = "rotated-access"
        session.refresh_token = "rotated-refresh"
        first_instance.update(session_id, session)

    assert second_instance.get(session_id).access_token == "rotated-access"
    assert second_instance.get(session_id).refresh_token == "rotated-refresh"

    second_instance.remove_user("student-id")
    assert first_instance.get(session_id) is None


def test_session_store_client_uses_server_secret_key(monkeypatch):
    supabase_database.create_session_store_client.cache_clear()
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "sb_secret_test")
    created = []

    def fake_create_client(url, key, *, options):
        created.append((url, key, options))
        return object()

    monkeypatch.setattr(supabase_database, "create_client", fake_create_client)
    try:
        supabase_database.create_session_store_client()
    finally:
        supabase_database.create_session_store_client.cache_clear()

    assert created[0][0:2] == ("https://example.supabase.co", "sb_secret_test")
    assert created[0][2].persist_session is False
    assert created[0][2].auto_refresh_token is False
