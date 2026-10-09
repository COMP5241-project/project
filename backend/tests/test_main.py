from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from threading import Event
from types import SimpleNamespace
import time
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from httpx import Client as HttpxClient

from app.database.supabase import get_supabase
from app.identity.auth import get_auth_client, get_optional_auth_client
from app.identity.sessions import COOKIE_NAME, Session, SessionStore, get_session_store
from app.main import app


@pytest.fixture
def mock_supabase() -> Mock:
    return Mock()


@pytest.fixture
def auth_client() -> Mock:
    client = Mock()
    user = SimpleNamespace(id="student-id", email="student@example.com")
    session = SimpleNamespace(
        access_token="private-access-token", refresh_token="private-refresh-token",
        expires_at=time.time() + 3600, expires_in=3600,
    )
    client.auth.sign_in_with_password.return_value = SimpleNamespace(user=user, session=session)
    client.auth.refresh_session.return_value = SimpleNamespace(user=user, session=session)
    client.auth.get_user.return_value = SimpleNamespace(user=user)
    client.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": user.id, "email": user.email, "role": "student",
        "cs_qualified": True, "assessment_completed": False,
    }
    return client


@pytest.fixture
def store() -> SessionStore:
    return SessionStore()


@pytest.fixture
def client(mock_supabase: Mock, auth_client: Mock, store: SessionStore) -> Iterator[HttpxClient]:
    app.dependency_overrides[get_supabase] = lambda: mock_supabase
    app.dependency_overrides[get_auth_client] = lambda: auth_client
    app.dependency_overrides[get_optional_auth_client] = lambda: auth_client
    app.dependency_overrides[get_session_store] = lambda: store
    with TestClient(app) as test_client:
        test_client.headers["Origin"] = "http://localhost:5173"
        yield test_client
    app.dependency_overrides.clear()


def test_root_returns_greeting(client: HttpxClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "Hello"}


def test_health_returns_ok_when_supabase_query_succeeds(
    client: HttpxClient, mock_supabase: Mock
) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    mock_supabase.table.assert_called_once_with("profiles")
    mock_supabase.table.return_value.select.assert_called_once_with("*")
    mock_supabase.table.return_value.select.return_value.limit.assert_called_once_with(1)
    mock_supabase.table.return_value.select.return_value.limit.return_value.execute.assert_called_once()


def test_health_returns_service_unavailable_when_supabase_query_fails(
    client: HttpxClient, mock_supabase: Mock
) -> None:
    execute = mock_supabase.table.return_value.select.return_value.limit.return_value.execute
    execute.side_effect = RuntimeError("database unavailable")

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json() == {
        "status": "error",
        "message": "database unavailable",
    }


def auth_login(client: HttpxClient):
    return client.post("/api/auth/login", json={"email": "student@example.com", "password": "secret-password"})


def test_auth_login_and_profile_use_private_cookie(client: HttpxClient, auth_client: Mock):
    response = auth_login(client)
    assert response.status_code == 200
    assert response.json()["profile"]["role"] == "student"
    assert "private-" not in response.text
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "SameSite=lax" in response.headers["set-cookie"]
    assert "Path=/api" in response.headers["set-cookie"]
    assert response.headers["cache-control"] == "no-store"
    assert client.cookies.get(COOKIE_NAME) != "private-access-token"
    response = client.get("/api/profiles/me")
    assert response.status_code == 200
    auth_client.auth.get_user.assert_called_once_with("private-access-token")
    auth_client.postgrest.auth.assert_called_with("private-access-token")
    auth_client.table.return_value.select.return_value.eq.assert_called_with("id", "student-id")



def test_auth_missing_session(client: HttpxClient):
    response = client.get("/api/profiles/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthenticated"


@pytest.mark.parametrize("origin", ["https://evil.example", ""])
def test_auth_rejects_untrusted_origin(client: HttpxClient, auth_client: Mock, origin: str):
    response = client.post("/api/auth/login", json={"email": "x", "password": "secret"}, headers={"Origin": origin})
    assert response.status_code == 403
    auth_client.auth.sign_in_with_password.assert_not_called()


@pytest.mark.parametrize(
    "origin",
    ["http://localhost:5173", "http://127.0.0.1:5173", "http://[::1]:5173", "http://LOCALHOST:5173"],
)
def test_auth_accepts_all_loopback_origin_spellings(
    client: HttpxClient, monkeypatch: pytest.MonkeyPatch, origin: str
):
    monkeypatch.setenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    response = client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": "secret-password"},
        headers={"Origin": origin},
    )
    assert response.status_code == 200


def test_auth_rejects_wrong_port_origin(
    client: HttpxClient, auth_client: Mock, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    response = client.post(
        "/api/auth/login", json={"email": "x", "password": "secret"},
        headers={"Origin": "http://localhost:5174"},
    )
    assert response.status_code == 403
    auth_client.auth.sign_in_with_password.assert_not_called()


def test_auth_invalid_request_does_not_echo_password(client: HttpxClient):
    response = client.post("/api/auth/login", json={"email": "", "password": "secret-password"})
    assert response.status_code == 422
    assert "secret-password" not in response.text


def test_auth_invalid_credentials(client: HttpxClient, auth_client: Mock):
    from supabase_auth.errors import AuthApiError
    auth_client.auth.sign_in_with_password.side_effect = AuthApiError("provider details", 400, "invalid_credentials")
    response = auth_login(client)
    assert response.status_code == 401
    assert "provider details" not in response.text
    assert COOKIE_NAME not in client.cookies


@pytest.mark.parametrize("data,status", [(None, 404), ({"role": "admin"}, 403), ("malformed", 503)])
def test_auth_profile_failure_does_not_create_session(client: HttpxClient, auth_client: Mock, store: SessionStore, data, status):
    auth_client.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = data
    response = auth_login(client)
    assert response.status_code == status
    assert not store.sessions
    assert COOKIE_NAME not in client.cookies
    auth_client.auth.admin.sign_out.assert_called_once_with("private-access-token", "local")


@pytest.mark.parametrize("data,status,code", [
    (None, 404, "profile_missing"),
    ({"role": "admin"}, 403, "unsupported_role"),
    ("malformed", 503, "profile_unavailable"),
])
def test_auth_profile_failure_preserves_session(client: HttpxClient, auth_client: Mock, store: SessionStore, data, status, code):
    auth_login(client)
    session_id = client.cookies.get(COOKIE_NAME)
    session = store.get(session_id)
    auth_client.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = data
    response = client.get("/api/profiles/me")
    assert response.status_code == status
    assert response.json()["error"]["code"] == code
    assert store.get(session_id) is session
    assert client.cookies.get(COOKIE_NAME) == session_id
    auth_client.auth.admin.sign_out.assert_not_called()


def test_auth_invalidated_session_during_profile_load_is_rejected(client: HttpxClient, auth_client: Mock, store: SessionStore):
    auth_login(client)
    session_id = client.cookies.get(COOKIE_NAME)
    execute = auth_client.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute
    result = execute.return_value

    def invalidate_during_profile_load():
        store.remove_user("student-id")
        return result

    execute.side_effect = invalidate_during_profile_load
    response = client.get("/api/profiles/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthenticated"
    assert store.get(session_id) is None
    assert COOKIE_NAME not in client.cookies


def test_auth_refresh_rotates_tokens(client: HttpxClient, auth_client: Mock, store: SessionStore):
    auth_login(client)
    session = store.get(client.cookies.get(COOKIE_NAME))
    session.token_expires_at = 0
    refreshed = auth_client.auth.refresh_session.return_value.session
    refreshed.access_token = "rotated-access"
    refreshed.refresh_token = "rotated-refresh"
    response = client.get("/api/profiles/me")
    assert response.status_code == 200
    auth_client.auth.refresh_session.assert_called_once_with("private-refresh-token")
    auth_client.auth.get_user.assert_called_with("rotated-access")
    assert session.refresh_token == "rotated-refresh"


@pytest.mark.parametrize("invalid", [True, False])
def test_auth_refresh_error_distinguishes_expiry_from_outage(client: HttpxClient, auth_client: Mock, store: SessionStore, invalid: bool):
    from supabase_auth.errors import AuthApiError
    auth_login(client)
    session_id = client.cookies.get(COOKIE_NAME)
    store.get(session_id).token_expires_at = 0
    auth_client.auth.refresh_session.side_effect = AuthApiError("expired", 400, "refresh_token_not_found") if invalid else RuntimeError("upstream offline")
    response = client.get("/api/profiles/me")
    assert response.status_code == (401 if invalid else 503)
    assert (store.get(session_id) is None) == invalid
    assert "upstream offline" not in response.text


def test_auth_absolute_session_expiry(client: HttpxClient, store: SessionStore):
    auth_login(client)
    store.get(client.cookies.get(COOKIE_NAME)).expires_at = 0
    assert client.get("/api/profiles/me").status_code == 401


def test_auth_replaced_session_is_removed(client: HttpxClient, store: SessionStore):
    auth_login(client)
    old_id = client.cookies.get(COOKIE_NAME)
    auth_login(client)
    assert store.get(old_id) is None
    assert len(store.sessions) == 1


def test_auth_rejects_mismatched_user(client: HttpxClient, auth_client: Mock, store: SessionStore):
    auth_login(client)
    auth_client.auth.get_user.return_value.user = SimpleNamespace(id="other-user", email="other@example.com")
    assert client.get("/api/profiles/me").status_code == 401
    assert not store.sessions


def test_auth_logout_without_session(client: HttpxClient):
    assert client.post("/api/auth/logout", json={}).status_code == 204


@pytest.mark.parametrize("unavailable", [False, True])
def test_auth_logout_invalidates_sessions_even_when_revocation_fails(client: HttpxClient, auth_client: Mock, store: SessionStore, unavailable: bool):
    auth_login(client)
    if unavailable:
        auth_client.auth.admin.sign_out.side_effect = RuntimeError("provider-secret")
    response = client.post("/api/auth/logout", json={})
    assert response.status_code == (503 if unavailable else 204)
    if unavailable:
        assert response.json()["error"]["signed_out"] is True
        assert "provider-secret" not in response.text
    assert not store.sessions
    assert COOKIE_NAME not in client.cookies
    assert client.get("/api/profiles/me").status_code == 401
    auth_client.auth.admin.sign_out.assert_called_once_with("private-access-token", "global")


def test_auth_logout_clears_only_this_users_sessions(client: HttpxClient, store: SessionStore):
    auth_login(client)
    store.add(Session("student-id", "second-token", "second-refresh", time.time() + 3600, time.time() + 3600))
    other_id = store.add(Session("other-user", "other-token", "other-refresh", time.time() + 3600, time.time() + 3600))
    assert client.post("/api/auth/logout", json={}).status_code == 204
    assert len(store.sessions) == 1
    assert store.get(other_id).user_id == "other-user"


def test_auth_refresh_is_serialized(client: HttpxClient, auth_client: Mock, store: SessionStore):
    auth_login(client)
    session_id = client.cookies.get(COOKIE_NAME)
    store.get(session_id).token_expires_at = 0
    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(lambda _: client.get("/api/profiles/me"), range(2)))
    assert all(response.status_code == 200 for response in responses)
    auth_client.auth.refresh_session.assert_called_once()


def test_auth_logout_does_not_resurrect_inflight_session(client: HttpxClient, auth_client: Mock, store: SessionStore):
    auth_login(client)
    session_id = client.cookies.get(COOKIE_NAME)
    started = Event()
    release = Event()
    verified = auth_client.auth.get_user.return_value

    def delayed_user(token):
        started.set()
        assert release.wait(5)
        return verified

    auth_client.auth.get_user.side_effect = delayed_user
    with ThreadPoolExecutor(max_workers=1) as executor:
        pending = executor.submit(client.get, "/api/profiles/me")
        assert started.wait(5)
        store.remove_user("student-id")
        release.set()
        assert pending.result(timeout=5).status_code == 401
    assert store.get(session_id) is None


def test_auth_missing_configuration_does_not_block_local_logout(client: HttpxClient, store: SessionStore):
    auth_login(client)
    app.dependency_overrides[get_optional_auth_client] = lambda: None
    response = client.post("/api/auth/logout", json={})
    assert response.status_code == 503
    assert response.json()["error"]["signed_out"] is True
    assert not store.sessions
    assert client.get("/api/profiles/me").status_code == 401


def test_auth_secure_cookie_configuration(client: HttpxClient, monkeypatch):
    monkeypatch.setenv("SESSION_COOKIE_SECURE", "true")
    assert "Secure" in auth_login(client).headers["set-cookie"]


def test_auth_mutations_require_json(client: HttpxClient):
    assert client.post("/api/auth/logout", content="text").status_code == 415


def test_auth_clients_do_not_share_authentication_state(monkeypatch):
    from httpx import Client as HttpClient
    from app.database.supabase import create_user_client
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "public-test-key")
    with HttpClient() as first_transport, HttpClient() as second_transport:
        first = create_user_client(first_transport)
        second = create_user_client(second_transport)
        first.postgrest.auth("first-user-jwt")
        second.postgrest.auth("second-user-jwt")
        assert first.postgrest.headers["Authorization"] == "Bearer first-user-jwt"
        assert second.postgrest.headers["Authorization"] == "Bearer second-user-jwt"
        assert first.options.persist_session is False
        assert first.options.auto_refresh_token is False