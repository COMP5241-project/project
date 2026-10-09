import logging
import os
import secrets
import time
from collections.abc import Iterator, Mapping
from dataclasses import dataclass, field
from threading import RLock
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Request, Response
from httpx import Client as HttpClient
from postgrest.exceptions import APIError
from pydantic import BaseModel, Field
from supabase import Client
from supabase_auth.errors import AuthApiError

from app.database.supabase import create_user_client

logger = logging.getLogger(__name__)
COOKIE_NAME = "polyu_session"
SESSION_SECONDS = 24 * 60 * 60
router = APIRouter(prefix="/api")


class ApiError(Exception):
    def __init__(
        self, status: int, code: str, message: str,
        *, clear_cookie: bool = False, signed_out: bool = False,
    ):
        self.status = status
        self.code = code
        self.message = message
        self.clear_cookie = clear_cookie
        self.signed_out = signed_out


class LoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=320)
    password: str = Field(min_length=1, max_length=4096)


class Profile(BaseModel):
    id: str
    email: str | None
    role: Literal["student", "instructor"]
    cs_qualified: bool
    assessment_completed: bool


class CurrentProfile(BaseModel):
    email: str
    profile: Profile


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


def get_optional_auth_client() -> Iterator[Client | None]:
    with HttpClient(timeout=15) as http_client:
        try:
            client = create_user_client(http_client)
        except Exception:
            client = None
        yield client


def get_auth_client(
    client: Annotated[Client | None, Depends(get_optional_auth_client)],
) -> Client:
    if client is None:
        raise ApiError(503, "service_unavailable", "The sign-in service is unavailable.") from None
    return client


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        COOKIE_NAME, path="/api", httponly=True, samesite="lax",
        secure=os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true",
    )


def require_origin(request: Request) -> None:
    allowed = {
        origin.strip() for origin in os.getenv(
            "FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",") if origin.strip()
    }
    if request.headers.get("origin") not in allowed:
        raise ApiError(403, "invalid_origin", "This request origin is not allowed.")
    if request.headers.get("content-type", "").split(";", 1)[0].strip() != "application/json":
        raise ApiError(415, "invalid_content_type", "A JSON request is required.")


def upstream_error(error: Exception, *, login: bool = False) -> ApiError:
    if isinstance(error, AuthApiError) and error.status in (400, 401, 403, 404, 422):
        return ApiError(
            401, "invalid_credentials" if login else "unauthenticated",
            "Incorrect email or password." if login else "Your session has expired. Sign in again.",
            clear_cookie=not login,
        )
    return ApiError(503, "service_unavailable", "The sign-in service is unavailable. Try again later.")


def load_profile(client: Client, user_id: str, email: str | None, token: str) -> CurrentProfile:
    try:
        client.postgrest.auth(token)
        result = client.table("profiles").select(
            "id, email, role, cs_qualified, assessment_completed"
        ).eq("id", user_id).maybe_single().execute()
        data = result.data if result else None
    except APIError as error:
        if error.code == "PGRST116":
            data = None
        else:
            raise ApiError(503, "profile_unavailable", "Unable to load your profile. Try again later.") from None
    except Exception:
        raise ApiError(503, "profile_unavailable", "Unable to load your profile. Try again later.") from None
    if not data:
        raise ApiError(404, "profile_missing", "Your account profile could not be found. Contact the administrator.")
    if not isinstance(data, Mapping):
        raise ApiError(503, "profile_unavailable", "Unable to load your profile. Try again later.")
    if data.get("role") not in ("student", "instructor"):
        raise ApiError(403, "unsupported_role", "Your account role is unsupported. Contact the administrator.")
    try:
        profile = Profile.model_validate(data)
        if profile.id != user_id:
            raise ValueError("Mismatched profile")
        return CurrentProfile(email=email or profile.email or "unknown user", profile=profile)
    except Exception:
        raise ApiError(503, "profile_unavailable", "Unable to load your profile. Try again later.") from None


ClientDependency = Annotated[Client, Depends(get_auth_client)]
OptionalClientDependency = Annotated[Client | None, Depends(get_optional_auth_client)]
StoreDependency = Annotated[SessionStore, Depends(get_session_store)]


@router.post("/auth/login", response_model=CurrentProfile, dependencies=[Depends(require_origin)])
def login(payload: LoginRequest, request: Request, response: Response,
          client: ClientDependency, store: StoreDependency) -> CurrentProfile:
    try:
        result = client.auth.sign_in_with_password({
            "email": payload.email.strip(), "password": payload.password,
        })
    except Exception as error:
        raise upstream_error(error, login=True) from None
    auth_session = result.session
    user = result.user
    if not auth_session or not user:
        raise ApiError(401, "invalid_credentials", "Sign-in failed. Try again.")
    try:
        profile = load_profile(client, user.id, user.email, auth_session.access_token)
    except ApiError:
        try:
            client.auth.admin.sign_out(auth_session.access_token, "local")
        except Exception:
            logger.warning("Failed to revoke an incomplete sign-in session")
        raise
    store.remove(request.cookies.get(COOKIE_NAME))
    session_id = store.add(Session(
        user_id=user.id, access_token=auth_session.access_token,
        refresh_token=auth_session.refresh_token,
        token_expires_at=auth_session.expires_at or time.time() + auth_session.expires_in,
        expires_at=time.time() + SESSION_SECONDS,
    ))
    response.set_cookie(
        COOKIE_NAME, session_id, max_age=SESSION_SECONDS, path="/api",
        httponly=True, samesite="lax",
        secure=os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true",
    )
    return profile


@router.get("/me", response_model=CurrentProfile)
def current_profile(request: Request, client: OptionalClientDependency,
                    store: StoreDependency) -> CurrentProfile:
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
        profile = load_profile(client, verified.user.id, verified.user.email, session.access_token)
        if store.get(session_id) is not session:
            raise ApiError(401, "unauthenticated", "Sign in again.", clear_cookie=True)
        return profile


@router.post("/auth/logout", status_code=204, dependencies=[Depends(require_origin)])
def logout(request: Request, response: Response, store: StoreDependency,
           client: OptionalClientDependency) -> None:
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