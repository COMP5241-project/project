import logging
import os
import secrets
import time
from collections.abc import Generator
from contextlib import contextmanager
from dataclasses import dataclass, field
from threading import RLock
from typing import Annotated

from fastapi import Depends, Request, Response
from supabase import Client
from supabase_auth import Session as AuthSession, User

from app.errors import ApiError, upstream_error

logger = logging.getLogger(__name__)
COOKIE_NAME = "polyu_session"
SESSION_SECONDS = 24 * 60 * 60


@dataclass
class Session:
    user_id: str
    access_token: str
    refresh_token: str
    token_expires_at: float
    expires_at: float
    lock: RLock = field(default_factory=RLock)


class SessionStore:
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

    def remove(self, session_id: str | None) -> None:
        with self.lock:
            if session_id is not None:
                self.sessions.pop(session_id, None)

    def remove_user(self, user_id: str) -> None:
        with self.lock:
            for key in list(self.sessions):
                if self.sessions[key].user_id == user_id:
                    del self.sessions[key]


session_store = SessionStore()


def get_session_store() -> SessionStore:
    return session_store


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
    session = store.get(session_id)
    if not session:
        raise ApiError(401, "unauthenticated", "Sign in to continue.", clear_cookie=True)
    if client is None:
        raise ApiError(503, "service_unavailable", "The sign-in service is unavailable.")
    with session.lock:
        if store.get(session_id) is not session:
            raise ApiError(401, "unauthenticated", "Sign in to continue.", clear_cookie=True)
        try:
            if session.token_expires_at <= time.time() + 60:
                refreshed = client.auth.refresh_session(session.refresh_token)
                if not refreshed.session or not refreshed.user or refreshed.user.id != session.user_id:
                    raise ApiError(401, "unauthenticated", "Sign in again.", clear_cookie=True)
                session.access_token = refreshed.session.access_token
                session.refresh_token = refreshed.session.refresh_token
                session.token_expires_at = refreshed.session.expires_at or time.time() + refreshed.session.expires_in
            verified = client.auth.get_user(session.access_token)
            if not verified or not verified.user or verified.user.id != session.user_id:
                raise ApiError(401, "unauthenticated", "Sign in again.", clear_cookie=True)
        except Exception as error:
            failure = error if isinstance(error, ApiError) else upstream_error(error)
            if failure.status == 401:
                store.remove(session_id)
            raise failure from None
        yield session, verified.user
        if store.get(session_id) is not session:
            raise ApiError(401, "unauthenticated", "Sign in again.", clear_cookie=True)


def end_session(request: Request, response: Response, store: SessionStore,
                client: Client | None) -> None:
    session = store.get(request.cookies.get(COOKIE_NAME))
    clear_session_cookie(response)
    if not session:
        return
    store.remove_user(session.user_id)
    with session.lock:
        try:
            if client is None:
                raise RuntimeError("Sign-in service unavailable")
            client.auth.admin.sign_out(session.access_token, "global")
        except Exception:
            raise ApiError(
                503, "logout_incomplete", "Signed out locally, but other sessions could not be revoked.",
                clear_cookie=True, signed_out=True,
            ) from None