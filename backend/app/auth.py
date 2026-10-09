import os
from collections.abc import Iterator, Mapping
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Request, Response
from httpx import Client as HttpClient
from postgrest.exceptions import APIError
from pydantic import BaseModel, Field
from supabase import Client

from app.database.supabase import create_user_client
from app.errors import ApiError, upstream_error
from app.sessions import StoreDependency, create_session, end_session, revoke_incomplete_session, verified_session

router = APIRouter(prefix="/api")


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
        revoke_incomplete_session(client, auth_session.access_token)
        raise
    create_session(request, response, store, user.id, auth_session)
    return profile


@router.get("/me", response_model=CurrentProfile)
def current_profile(request: Request, client: OptionalClientDependency,
                    store: StoreDependency) -> CurrentProfile:
    with verified_session(request, client, store) as (session, user):
        assert client is not None
        return load_profile(client, user.id, user.email, session.access_token)


@router.post("/auth/logout", status_code=204, dependencies=[Depends(require_origin)])
def logout(request: Request, response: Response, store: StoreDependency,
           client: OptionalClientDependency) -> None:
    end_session(request, response, store, client)