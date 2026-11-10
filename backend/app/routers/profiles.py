from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.identity.auth import OptionalClientDependency
from app.identity.errors import ApiError
from app.identity.profiles import CurrentProfile, load_profile
from app.identity.sessions import StoreDependency, verified_session

router = APIRouter(prefix="/api/profiles")


class AssessmentRequest(BaseModel):
    cs_qualified: bool


@router.get("/me", response_model=CurrentProfile)
def current_profile(request: Request, client: OptionalClientDependency,
                    store: StoreDependency) -> CurrentProfile:
    with verified_session(request, client, store) as (session, user):
        assert client is not None
        return load_profile(client, user.id, user.email, session.access_token)


@router.post("/assessment", response_model=CurrentProfile)
def complete_assessment(payload: AssessmentRequest, request: Request,
                        client: OptionalClientDependency, store: StoreDependency) -> CurrentProfile:
    with verified_session(request, client, store) as (session, user):
        assert client is not None
        try:
            client.postgrest.auth(session.access_token)
            client.table("profiles").update({
                "cs_qualified": payload.cs_qualified,
                "assessment_completed": True,
            }).eq("id", user.id).execute()
        except Exception:
            raise ApiError(503, "assessment_unavailable", "Unable to save your assessment result.") from None
        current = load_profile(client, user.id, user.email, session.access_token)
        if not current.profile.assessment_completed or current.profile.cs_qualified != payload.cs_qualified:
            raise ApiError(503, "assessment_unavailable", "Unable to save your assessment result.")
        return current


@router.post("/non-cs-introduction", response_model=CurrentProfile)
def complete_non_cs_introduction(request: Request, client: OptionalClientDependency,
                                 store: StoreDependency) -> CurrentProfile:
    with verified_session(request, client, store) as (session, user):
        assert client is not None
        current = load_profile(client, user.id, user.email, session.access_token)
        if (current.profile.role != "student" or not current.profile.assessment_completed
                or current.profile.cs_qualified):
            raise ApiError(403, "introduction_not_available", "This introduction is for non-CS students.")
        try:
            client.postgrest.auth(session.access_token)
            client.table("profiles").update({
                "non_cs_introduction_completed": True,
            }).eq("id", user.id).execute()
        except Exception:
            raise ApiError(503, "introduction_unavailable", "Unable to save your introduction progress.") from None
        current = load_profile(client, user.id, user.email, session.access_token)
        if not current.profile.non_cs_introduction_completed:
            raise ApiError(503, "introduction_unavailable", "Unable to save your introduction progress.")
        return current