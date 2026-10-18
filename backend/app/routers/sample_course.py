"""Public sample mini-course endpoints.

``GET /content`` and ``POST /answer`` need no authentication: the course is
a public preview and answers are checked server-side. ``POST /tutor`` is
open to guests too, but every LLM judgement is quota-limited (see
``app.sample_course.quota``).
"""
from typing import Annotated, Literal, Union

from fastapi import APIRouter, Request, Response
from httpx import Client as HttpClient
from pydantic import BaseModel, Field

from app.identity.auth import OptionalClientDependency
from app.identity.errors import ApiError
from app.identity.sessions import StoreDependency, optional_verified_session
from app.sample_course.content import (
    course_player_view,
    find_answer_moment,
    find_tutor_moment,
)
from app.sample_course.quota import (
    SampleQuotaDependency,
    check_quota,
    ensure_guest_cookie,
    refund_hit,
    register_hit,
    remaining_uses,
)
from app.sample_course.tutor import (
    JudgeNotConfiguredError,
    JudgeUnavailableError,
    judge_answer,
)

router = APIRouter(prefix="/api/sample-course")


class AnswerRequest(BaseModel):
    moment_id: str = Field(min_length=1, max_length=60)
    choice: str = Field(min_length=1, max_length=60)


class AnswerDecision(BaseModel):
    type: Literal["decision"]
    correct: bool
    feedback: str


class AnswerQuiz(BaseModel):
    type: Literal["quiz"]
    correct: bool
    correct_index: int
    explanation: str


class AnswerBot(BaseModel):
    type: Literal["bot"]
    kind: Literal["success", "near_miss", "flaw"]
    reaction: str
    lesson: str | None = None


AnswerResponse = Annotated[
    Union[AnswerDecision, AnswerQuiz, AnswerBot], Field(discriminator="type")
]


class TutorRequest(BaseModel):
    moment_id: str = Field(min_length=1, max_length=60)
    answer: str = Field(min_length=20, max_length=300)


class TutorResponse(BaseModel):
    score: int
    feedback: str
    key_points: list[str]
    remaining_uses: int


@router.get("/content")
def content():
    # Player view only — answer keys stay server-side.
    return course_player_view()


@router.post("/answer", response_model=AnswerResponse)
def answer(payload: AnswerRequest) -> AnswerResponse:
    moment = find_answer_moment(payload.moment_id)
    if moment is None:
        raise ApiError(404, "moment_not_found", "This exercise is not available.")
    kind, data = moment
    if kind == "decision":
        option = next((item for item in data.options if item.id == payload.choice), None)
        if option is None:
            raise ApiError(404, "choice_not_found", "That option is not available.")
        return AnswerDecision(type="decision", correct=option.correct, feedback=option.feedback)
    if kind == "quiz":
        try:
            selected = int(payload.choice)
        except ValueError:
            raise ApiError(404, "choice_not_found", "That option is not available.") from None
        if not 0 <= selected < len(data.options):
            raise ApiError(404, "choice_not_found", "That option is not available.")
        correct = selected == data.correct_index
        return AnswerQuiz(
            type="quiz",
            correct=correct,
            correct_index=data.correct_index,
            explanation=data.explanation,
        )
    bot_input = next((item for item in data.inputs if item.id == payload.choice), None)
    if bot_input is None:
        raise ApiError(404, "choice_not_found", "That input is not available.")
    return AnswerBot(type="bot", kind=bot_input.kind, reaction=bot_input.reaction, lesson=bot_input.lesson)


@router.post("/tutor", response_model=TutorResponse)
def tutor(
    payload: TutorRequest,
    request: Request,
    response: Response,
    client: OptionalClientDependency,
    store: StoreDependency,
    quota: SampleQuotaDependency,
) -> TutorResponse:
    moment = find_tutor_moment(payload.moment_id)
    if moment is None:
        raise ApiError(404, "moment_not_found", "This AI tutor moment is not available.")
    ip = request.client.host if request.client else "unknown"
    with optional_verified_session(request, client, store) as pair:
        user_id = pair[1].id if pair else None
        guest_id = None if user_id else ensure_guest_cookie(request, response)
        check_quota(
            quota, user_id=user_id, guest_id=guest_id,
            moment_id=payload.moment_id, ip=ip,
        )
        try:
            with HttpClient(timeout=60) as http_client:
                verdict = judge_answer(moment.system_prompt, payload.answer, http_client)
        except JudgeNotConfiguredError:
            raise ApiError(
                503, "tutor_unavailable",
                "The AI tutor is not configured. Ask your instructor to enable it.",
            ) from None
        except JudgeUnavailableError:
            refund_hit(
                quota, user_id=user_id, guest_id=guest_id,
                moment_id=payload.moment_id, ip=ip,
            )
            raise ApiError(
                503, "tutor_unavailable", "The AI tutor is unavailable. Please try again later.",
            ) from None
        register_hit(
            quota, user_id=user_id, guest_id=guest_id,
            moment_id=payload.moment_id, ip=ip,
        )
        return TutorResponse(
            score=verdict.score,
            feedback=verdict.feedback,
            key_points=list(moment.key_points),
            remaining_uses=remaining_uses(
                quota, user_id=user_id, guest_id=guest_id, moment_id=payload.moment_id,
            ),
        )