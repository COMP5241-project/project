import os

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field

from app.auth import ClientDependency, OptionalClientDependency
from app.errors import ApiError, upstream_error
from app.profiles import CurrentProfile, load_profile
from app.sessions import StoreDependency, create_session, end_session, revoke_incomplete_session

router = APIRouter(prefix="/api/auth")


class LoginRequest(BaseModel):
	email: str = Field(min_length=1, max_length=320)
	password: str = Field(min_length=1, max_length=4096)


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


@router.post("/login", response_model=CurrentProfile, dependencies=[Depends(require_origin)])
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


@router.post("/logout", status_code=204, dependencies=[Depends(require_origin)])
def logout(request: Request, response: Response, store: StoreDependency,
		   client: OptionalClientDependency) -> None:
	end_session(request, response, store, client)