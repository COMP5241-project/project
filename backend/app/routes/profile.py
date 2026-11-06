from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])


class ProfileResponse(BaseModel):
    email: EmailStr


@router.get("/me", response_model=ProfileResponse)
def get_profile(session: Request) -> ProfileResponse:
    user = session.session.get("user")
    if not isinstance(user, dict) or not isinstance(user.get("email"), str):
        raise HTTPException(status_code=401, detail="Not authenticated")

    return ProfileResponse.model_validate(user)
