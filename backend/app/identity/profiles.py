from collections.abc import Mapping
from typing import Literal

from postgrest.exceptions import APIError
from pydantic import BaseModel
from supabase import Client

from app.identity.errors import ApiError


class Profile(BaseModel):
    id: str
    email: str | None
    role: Literal["student", "instructor"]
    cs_qualified: bool
    assessment_completed: bool


class CurrentProfile(BaseModel):
    email: str
    profile: Profile


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