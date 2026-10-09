from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app.identity.auth import OptionalClientDependency
from app.identity.errors import ApiError
from app.identity.sessions import StoreDependency, verified_session

router = APIRouter(prefix="/api/profiles")


class HallucinationResultIn(BaseModel):
    challenge_id: str = Field(min_length=1, max_length=120)
    score: int = Field(ge=0, le=100)
    critique: str = Field(min_length=1, max_length=8000)
    feedback: str | None = Field(default=None, max_length=8000)


@router.post("/hallucination-results", status_code=204)
def save_hallucination_result(
    payload: HallucinationResultIn,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
) -> None:
    # The insert uses the signed-in user's own JWT, so the table's row-level
    # security policy (insert only when auth.uid() = user_id) stays in force.
    with verified_session(request, client, store) as (session, user):
        assert client is not None
        try:
            client.postgrest.auth(session.access_token)
            client.table("hallucination_results").insert({
                "user_id": user.id,
                "challenge_id": payload.challenge_id,
                "score": payload.score,
                "critique": payload.critique,
                "feedback": payload.feedback,
            }).execute()
        except Exception:
            raise ApiError(503, "result_save_failed", "Unable to save your result. Try again later.") from None
