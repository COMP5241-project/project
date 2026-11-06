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
        error_status = error.status
        if error_status < status.HTTP_400_BAD_REQUEST or error_status >= 500:
            error_status = status.HTTP_502_BAD_GATEWAY
        raise HTTPException(
            status_code=error_status,
            detail=error.message,
        ) from error

    return RegisterResponse(
        message="Register OK",
        email=request.email,
        confirmation_required=response.session is None,
    )
