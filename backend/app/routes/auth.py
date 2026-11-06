from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from supabase import Client

from app.database.supabase import get_supabase_client

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class EmailRequest(BaseModel):
    email: EmailStr


def accept_email(email: EmailStr, supabase_client: Client) -> dict:
    response = (
        supabase_client.table("user")
        .upsert(
            {"email": str(email)},
            on_conflict="email",
            ignore_duplicates=True,
        )
        .select("email")
        .execute()
    )

    created = bool(response.data)
    if created:
        user = response.data[0]
    else:
        existing_user = (
            supabase_client.table("user")
            .select("email")
            .eq("email", str(email))
            .single()
            .execute()
        )
        user = existing_user.data

    return {
        "status": "success",
        "message": "Account created" if created else "Signed in",
        "created": created,
        "user": {"email": user["email"]},
    }


@router.post("/login")
def login(
    request: EmailRequest,
    supabase_client: Annotated[Client, Depends(get_supabase_client)],
):
    return accept_email(request.email, supabase_client)


@router.post("/register")
def register(
    request: EmailRequest,
    supabase_client: Annotated[Client, Depends(get_supabase_client)],
):
    return accept_email(request.email, supabase_client)