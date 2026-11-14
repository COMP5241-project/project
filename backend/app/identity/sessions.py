import hashlib
import logging
import os
import secrets
import time
import uuid
from collections.abc import Callable, Generator
from contextlib import AbstractContextManager, contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import RLock
from typing import Annotated, Any, Protocol

from fastapi import Depends, Request, Response
from supabase import Client
from supabase_auth import Session as AuthSession, User

from app.database.supabase import create_session_store_client
from app.identity.errors import ApiError, upstream_error

logger = logging.getLogger(__name__)
COOKIE_NAME = "polyu_session"
SESSION_SECONDS = 24 * 60 * 60
SESSION_LOCK_SECONDS = 45
SESSION_LOCK_WAIT_SECONDS = 20
SESSION_LOCK_POLL_SECONDS = 0.05


@dataclass
class Session:
    user_id: str
    access_token: str
    refresh_token: str
    token_expires_at: float
    expires_at: float
    lock: RLock = field(default_factory=RLock, repr=False, compare=False)
    generation: str = field(default_factory=lambda: str(uuid.uuid4()))


class SessionStore(Protocol):
    def get(self, session_id: str | None) -> Session | None: ...

    def add(self, session: Session) -> str: ...

    def update(self, session_id: str, session: Session) -> None: ...

    def remove(self, session_id: str | None) -> None: ...

    def remove_user(self, user_id: str) -> None: ...

    def locked(self, session_id: str | None) -> AbstractContextManager[Session | None]: ...


def _session_hash(session_id: str) -> str:
    return hashlib.sha256(session_id.encode("utf-8")).hexdigest()


def _timestamp(value: str) -> float:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


def _iso_timestamp(value: float) -> str:
    return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()


class InMemorySessionStore:
    """Test adapter; production uses PostgresSessionStore."""

    def __init__(self):
        self.sessions: dict[str, Session] = {}
        self.lock = RLock()

    def get(self, session_id: str | None) -> Session | None:
        with self.lock:
            now = time.time()
            for key in list(self.sessions):
                if self.sessions[key].expires_at <= now:
                    del self.sessions[key]
            return self.sessions.get(session_id) if session_id else None

    def add(self, session: Session) -> str:
        with self.lock:
            self.get(None)
            session_id = secrets.token_urlsafe(32)
            self.sessions[session_id] = session
            return session_id

    def update(self, session_id: str, session: Session) -> None:
        with self.lock:
            current = self.sessions.get(session_id)
            if current and current.generation == session.generation:
                self.sessions[session_id] = session

    def remove(self, session_id: str | None) -> None:
        with self.lock:
            if session_id is not None:
                self.sessions.pop(session_id, None)

    def remove_user(self, user_id: str) -> None:
        with self.lock:
            for key in list(self.sessions):
                if self.sessions[key].user_id == user_id:
                    del self.sessions[key]

    @contextmanager
    def locked(self, session_id: str | None) -> Generator[Session | None, None, None]:
        session = self.get(session_id)
        if session is None:
            yield None
            return
        with session.lock:
            yield self.get(session_id)


class PostgresSessionStore:
    def __init__(self, client: Client):
        self.client = client

    def _execute(self, operation: Callable[[], Any]) -> Any:
        try:
            return operation()
        except Exception:
            logger.exception("Postgres session-store operation failed")
            raise ApiError(
                503, "service_unavailable", "The sign-in service is unavailable. Try again later.",
            ) from None

    def get(self, session_id: str | None) -> Session | None:
        if not session_id:
            return None
        row = self._execute(
            lambda: self.client.table("backend_sessions")
            .select("*")
            .eq("session_hash", _session_hash(session_id))
            .maybe_single()
            .execute()
        ).data
        if not row:
            return None
        session = Session(
            user_id=row["user_id"],
            access_token=row["access_token"],
            refresh_token=row["refresh_token"],
            token_expires_at=_timestamp(row["token_expires_at"]),
            expires_at=_timestamp(row["expires_at"]),
            generation=row["session_generation"],
        )
        if session.expires_at <= time.time():
            self.remove(session_id)
            return None
        return session

    def add(self, session: Session) -> str:
        session_id = secrets.token_urlsafe(32)
        now = _iso_timestamp(time.time())
        self._execute(
            lambda: self.client.table("backend_sessions")
            .delete()
            .lte("expires_at", now)
            .execute()
        )
        self._execute(
            lambda: self.client.table("backend_sessions")
            .insert({
                "session_hash": _session_hash(session_id),
                "session_generation": session.generation,
                "user_id": session.user_id,
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "token_expires_at": _iso_timestamp(session.token_expires_at),
                "expires_at": _iso_timestamp(session.expires_at),
            })
            .execute()
        )
        return session_id

    def update(self, session_id: str, session: Session) -> None:
        self._execute(
            lambda: self.client.table("backend_sessions")
            .update({
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "token_expires_at": _iso_timestamp(session.token_expires_at),
            })
            .eq("session_hash", _session_hash(session_id))
            .eq("session_generation", session.generation)
            .execute()
        )

    def remove(self, session_id: str | None) -> None:
        if not session_id:
            return
        self._execute(
            lambda: self.client.table("backend_sessions")
            .delete()
            .eq("session_hash", _session_hash(session_id))
            .execute()
        )

    def remove_user(self, user_id: str) -> None:
        self._execute(
            lambda: self.client.table("backend_sessions")
            .delete()
            .eq("user_id", user_id)
            .execute()
        )

    def _acquire_lock(self, session_hash: str, lock_id: str) -> bool:
        data = self._execute(
            lambda: self.client.rpc(
                "acquire_backend_session_lock",
                {
                    "p_session_hash": session_hash,
                    "p_lock_id": lock_id,
                    "p_lock_seconds": SESSION_LOCK_SECONDS,
                },
            ).execute()
        ).data
        return data is True

    def _release_lock(self, session_hash: str, lock_id: str) -> None:
        self._execute(
            lambda: self.client.rpc(
                "release_backend_session_lock",
                {"p_session_hash": session_hash, "p_lock_id": lock_id},
            ).execute()
        )

    @contextmanager
    def locked(self, session_id: str | None) -> Generator[Session | None, None, None]:
        if not session_id:
            yield None
            return
        session_hash = _session_hash(session_id)
        lock_id = str(uuid.uuid4())
        deadline = time.monotonic() + SESSION_LOCK_WAIT_SECONDS
        while not self._acquire_lock(session_hash, lock_id):
            if self.get(session_id) is None:
                yield None
                return
            if time.monotonic() >= deadline:
                raise ApiError(
                    503, "session_busy", "Your session is busy. Please retry the request.",
                )
            time.sleep(SESSION_LOCK_POLL_SECONDS)
        try:
            yield self.get(session_id)
        except BaseException:
            try:
                self._release_lock(session_hash, lock_id)
            except ApiError:
                logger.error("Session lock will expire after its lease")
            raise
        else:
            self._release_lock(session_hash, lock_id)


def get_session_store() -> SessionStore:
    try:
        return PostgresSessionStore(create_session_store_client())
    except RuntimeError:
        raise ApiError(
            503, "service_unavailable", "The sign-in service is unavailable. Try again later.",
        ) from None


StoreDependency = Annotated[SessionStore, Depends(get_session_store)]


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        COOKIE_NAME, path="/api", httponly=True, samesite="lax",
        secure=os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true",
    )


def set_session_cookie(response: Response, session_id: str) -> None:
    response.set_cookie(
        COOKIE_NAME, session_id, max_age=SESSION_SECONDS, path="/api",
        httponly=True, samesite="lax",
        secure=os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true",
    )


def create_session(request: Request, response: Response, store: SessionStore,
                   user_id: str, auth_session: AuthSession) -> None:
    store.remove(request.cookies.get(COOKIE_NAME))
    session_id = store.add(Session(
        user_id=user_id, access_token=auth_session.access_token,
        refresh_token=auth_session.refresh_token,
        token_expires_at=auth_session.expires_at or time.time() + auth_session.expires_in,
        expires_at=time.time() + SESSION_SECONDS,
    ))
    set_session_cookie(response, session_id)


def revoke_incomplete_session(client: Client, access_token: str) -> None:
    try:
        client.auth.admin.sign_out(access_token, "local")
    except Exception:
        logger.warning("Failed to revoke an incomplete sign-in session")


@contextmanager
def verified_session(request: Request, client: Client | None,
                     store: SessionStore) -> Generator[tuple[Session, User]]:
    session_id = request.cookies.get(COOKIE_NAME)
    if not session_id:
        raise ApiError(401, "unauthenticated", "Sign in to continue.", clear_cookie=True)
    if client is None:
        raise ApiError(503, "service_unavailable", "The sign-in service is unavailable.")
    with store.locked(session_id) as session:
        if not session:
            raise ApiError(401, "unauthenticated", "Sign in to continue.", clear_cookie=True)
        try:
            if session.token_expires_at <= time.time() + 60:
                refreshed = client.auth.refresh_session(session.refresh_token)
                if not refreshed.session or not refreshed.user or refreshed.user.id != session.user_id:
                    raise ApiError(401, "unauthenticated", "Sign in again.", clear_cookie=True)
                session.access_token = refreshed.session.access_token
                session.refresh_token = refreshed.session.refresh_token
                session.token_expires_at = refreshed.session.expires_at or time.time() + refreshed.session.expires_in
                store.update(session_id, session)
            verified = client.auth.get_user(session.access_token)
            if not verified or not verified.user or verified.user.id != session.user_id:
                raise ApiError(401, "unauthenticated", "Sign in again.", clear_cookie=True)
        except Exception as error:
            failure = error if isinstance(error, ApiError) else upstream_error(error)
            if failure.status == 401:
                store.remove(session_id)
            raise failure from None
    yield session, verified.user
    current_session = store.get(session_id)
    if not current_session or current_session.generation != session.generation:
        raise ApiError(401, "unauthenticated", "Sign in again.", clear_cookie=True)


@contextmanager
def optional_verified_session(
    request: Request, client: Client | None, store: SessionStore,
) -> Generator[tuple[Session, User] | None, None, None]:
    """Yield ``(session, user)`` when a valid session exists, else ``None``.

    Same verification as ``verified_session``, but a missing or invalid
    session is not an error: endpoints that also serve guests fall back to
    the guest path instead of returning 401. Service-level failures (503)
    still propagate, exactly like in ``verified_session``.
    """
    try:
        with verified_session(request, client, store) as pair:
            yield pair
    except ApiError as error:
        if error.status != 401:
            raise
        yield None


def end_session(request: Request, response: Response, store: SessionStore,
                client: Client | None) -> None:
    session = store.get(request.cookies.get(COOKIE_NAME))
    clear_session_cookie(response)
    if not session:
        return
    store.remove_user(session.user_id)
    # Global revocation is best-effort: the local session is gone and the
    # cookie is cleared above, so the sign-out has already succeeded for the
    # browser. The client is keyed with the public anon key, so the admin
    # sign-out call usually cannot be confirmed; raising here would turn
    # every sign-out into an error response.
    try:
        if client is None:
            raise RuntimeError("Sign-in service unavailable")
        client.auth.admin.sign_out(session.access_token, "global")
    except Exception:
        logger.warning("Global Supabase session revocation failed during sign-out")
