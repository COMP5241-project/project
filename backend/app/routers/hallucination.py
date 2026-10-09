from fastapi import APIRouter, Request
from httpx import Client as HttpClient
from pydantic import BaseModel, Field

from app.hallucination.challenges import HALLUCINATION_CHALLENGES, find_challenge
from app.hallucination.judge import (
    JudgeNotConfiguredError,
    JudgeUnavailableError,
    judge_critique,
)
from app.identity.auth import OptionalClientDependency
from app.identity.errors import ApiError
from app.identity.sessions import StoreDependency, verified_session

router = APIRouter(prefix="/api/hallucination")


class JudgeRequest(BaseModel):
    challenge_id: str = Field(min_length=1, max_length=120)
    critique: str = Field(min_length=1, max_length=8000)
    tapped_line: int = Field(ge=0)


@router.get("/challenges")
def list_challenges():
    # Player view only — flaw_line/flaw_summary stay server-side.
    return [challenge.to_player_view() for challenge in HALLUCINATION_CHALLENGES]


@router.post("/judge")
def judge(
    payload: JudgeRequest,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
):
    # Requires a signed-in session so grading is tied to a real student.
    with verified_session(request, client, store):
        challenge = find_challenge(payload.challenge_id)
        if challenge is None:
            raise ApiError(404, "challenge_not_found", "This challenge is not available.")
        try:
            with HttpClient(timeout=60) as http_client:
                verdict = judge_critique(
                    challenge,
                    payload.critique,
                    payload.tapped_line,
                    http_client,
                )
        except JudgeNotConfiguredError:
            raise ApiError(
                503, "judge_unavailable", "The AI tutor is not configured. Ask your instructor to enable it."
            ) from None
        except JudgeUnavailableError:
            raise ApiError(
                503, "judge_unavailable", "The AI tutor is unavailable. Please try again later."
            ) from None
        # The verdict screen reveals the correct line and the flaw, so both are
        # safe to return now that the student has already submitted their tap.
        return {**verdict.model_dump(), "flaw_line": challenge.flaw_line, "flaw_summary": challenge.flaw_summary}
