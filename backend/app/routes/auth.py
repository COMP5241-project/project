from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from supabase import Client
from supabase_auth.errors import AuthApiError

from app.database.supabase import get_supabase_client

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterResponse(BaseModel):
    message: str
    email: EmailStr
    confirmation_required: bool


class LoginResponse(BaseModel):
    message: str
    email: EmailStr
    access_token: str
    token_type: str


def raise_auth_error(error: AuthApiError) -> None:
    error_status = error.status
    if error_status < status.HTTP_400_BAD_REQUEST or error_status >= 500:
        error_status = status.HTTP_502_BAD_GATEWAY
    raise HTTPException(
        status_code=error_status,
        detail=error.message,
    ) from error


@router.post("/register")
def register(
    request: RegisterRequest,
    supabase_client: Annotated[Client, Depends(get_supabase_client)],
) -> RegisterResponse:
    try:
        response = supabase_client.auth.sign_up(
            {"email": str(request.email), "password": request.password}
        )
    except AuthApiError as error:
        raise_auth_error(error)

    return RegisterResponse(
        message="Register OK",
        email=request.email,
        confirmation_required=response.session is None,
    )


@router.post("/login")
def login(
    request: RegisterRequest,
    supabase_client: Annotated[Client, Depends(get_supabase_client)],
) -> LoginResponse:
    try:
        response = supabase_client.auth.sign_in_with_password(
            {"email": str(request.email), "password": request.password}
        )
    except AuthApiError as error:
        raise_auth_error(error)

    if response.session is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Supabase did not return a login session",
        )

    return LoginResponse(
        message="Login OK",
        email=request.email,
        access_token=response.session.access_token,
        token_type=response.session.token_type,
    )
