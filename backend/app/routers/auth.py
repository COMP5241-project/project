import os
import re
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field, model_validator
from supabase_auth.errors import AuthApiError

from app.identity.auth import ClientDependency, OptionalClientDependency
from app.identity.errors import ApiError, upstream_error
from app.identity.profiles import CurrentProfile, load_profile
from app.identity.sessions import StoreDependency, create_session, end_session, revoke_incomplete_session

router = APIRouter(prefix="/api/auth")


class LoginRequest(BaseModel):
	email: str = Field(min_length=1, max_length=320)
	password: str = Field(min_length=1, max_length=4096)


class PasswordResetRequest(BaseModel):
	email: str = Field(min_length=1, max_length=320)


class PasswordResetVerifyRequest(BaseModel):
	email: str = Field(min_length=1, max_length=320)
	code: str = Field(min_length=8, max_length=8, pattern=r"^\d{8}$")
	password: str = Field(min_length=1, max_length=4096)
	password_confirmation: str = Field(min_length=1, max_length=4096)

	@model_validator(mode="after")
	def passwords_match(self) -> "PasswordResetVerifyRequest":
		if self.password != self.password_confirmation:
			raise ValueError("Passwords do not match.")
		return self


_LOOPBACK_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})
_DEFAULT_PORTS = {"http": 80, "https": 443}


def normalize_origin(origin: str) -> str:
	"""Canonicalize an Origin value for allow-list comparison.

	Lowercases scheme and host and drops the scheme's default port. Loopback
	host spellings (``localhost``, ``127.0.0.1``, ``[::1]``) are collapsed to a
	single token, so the same local dev server is accepted no matter how the
	browser resolves ``localhost`` (IPv4 vs IPv6).
	"""
	parts = urlsplit(origin.strip().lower())
	host = parts.hostname or ""
	if host in _LOOPBACK_HOSTS:
		host = "loopback"
	try:
		port = parts.port
	except ValueError:
		port = None
	if port is None or port == _DEFAULT_PORTS.get(parts.scheme):
		port = None
	netloc = host if port is None else f"{host}:{port}"
	return f"{parts.scheme}://{netloc}"


def require_trusted_origin(request: Request) -> None:
	allowed = {
		normalize_origin(origin)
		for origin in os.getenv(
			"FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
		).split(",")
		if origin.strip()
	}
	codespace_name = os.getenv("CODESPACE_NAME", "").strip()
	forwarding_domain = os.getenv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "").strip()
	if codespace_name and forwarding_domain:
		origin = request.headers.get("origin", "")
		parts = urlsplit(origin.strip().lower())
		host = parts.hostname or ""
		codespace_host = (
			rf"{re.escape(codespace_name.lower())}-(?P<port>\d+)\."
			rf"{re.escape(forwarding_domain.lower())}"
		)
		codespace_match = re.fullmatch(codespace_host, host)
		if (
			parts.scheme == "https"
			and parts.port in (None, _DEFAULT_PORTS["https"])
			and codespace_match is not None
			and 1 <= int(codespace_match.group("port")) <= 65535
		):
			allowed.add(normalize_origin(origin))
	if normalize_origin(request.headers.get("origin", "")) not in allowed:
		raise ApiError(403, "invalid_origin", "This request origin is not allowed.")


def require_origin(request: Request) -> None:
	require_trusted_origin(request)
	if request.headers.get("content-type", "").split(";", 1)[0].strip() != "application/json":
		raise ApiError(415, "invalid_content_type", "A JSON request is required.")


def password_reset_error(error: Exception, *, verifying: bool = False) -> ApiError:
	if isinstance(error, AuthApiError) and error.status in (400, 401, 403, 404, 422):
		message = (
			"The verification code is invalid or expired."
			if verifying else
			"We could not find an account for that email address."
		)
		return ApiError(400, "invalid_password_reset", message)
	return ApiError(503, "service_unavailable", "The password reset service is unavailable.")


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


@router.post("/password-reset/request", status_code=204, dependencies=[Depends(require_origin)])
def request_password_reset(
	payload: PasswordResetRequest, client: ClientDependency
) -> None:
	try:
		client.auth.sign_in_with_otp({
			"email": payload.email.strip(),
			"options": {"should_create_user": False},
		})
	except Exception as error:
		raise password_reset_error(error) from None


@router.post("/password-reset/verify", status_code=204, dependencies=[Depends(require_origin)])
def verify_password_reset(payload: PasswordResetVerifyRequest, client: ClientDependency) -> None:
	try:
		client.auth.verify_otp({
			"email": payload.email.strip(),
			"token": payload.code,
			"type": "email",
		})
		client.auth.update_user({"password": payload.password})
	except Exception as error:
		raise password_reset_error(error, verifying=True) from None


@router.post("/logout", status_code=204, dependencies=[Depends(require_origin)])
def logout(request: Request, response: Response, store: StoreDependency,
		   client: OptionalClientDependency) -> None:
	end_session(request, response, store, client)