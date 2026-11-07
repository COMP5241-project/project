from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from openai import OpenAI, OpenAIError
from pydantic import BaseModel
from supabase import Client

from app.database.supabase import get_supabase_client
from app.services.learning_sessions import generate_lesson
from app.services.openai.openai_client import OpenAIModel, get_openai_client

router = APIRouter(prefix="/api/v1/learning-sessions", tags=["learning sessions"])

CourseTopic = Literal[
    "software-engineering-fundamentals",
    "ai-coding-agents",
    "software-development-soft-skills",
]
PresentationFormat = Literal[
    "text-and-images",
    "interactive-simulations",
    "interactive-role-play-activities",
    "games",
    "animations",
    "slides-based",
    "online-coding",
]
ExperienceLevel = Literal["beginner", "intermediate"]


class LearningSessionCreate(BaseModel):
    course_topic: CourseTopic
    presentation_format: PresentationFormat
    experience_level: ExperienceLevel


class LearningSessionCreated(BaseModel):
    id: UUID
    status: Literal["ready"]


class LearningSessionResponse(BaseModel):
    id: UUID
    course_topic: CourseTopic
    presentation_format: PresentationFormat
    experience_level: ExperienceLevel
    learner_background: str | None
    learning_goal: str | None
    status: Literal["generating", "ready", "failed"]
    content: str | None


class LearningSessionSummary(BaseModel):
    id: UUID
    course_topic: CourseTopic
    presentation_format: PresentationFormat
    experience_level: ExperienceLevel
    status: Literal["generating", "ready", "failed"]
    created_at: str


def get_current_user_id(
    session: Request,
    supabase_client: Annotated[Client, Depends(get_supabase_client)],
) -> int:
    user = session.session.get("user")
    if not isinstance(user, dict) or not isinstance(user.get("email"), str):
        raise HTTPException(status_code=401, detail="Not authenticated")

    users = (
        supabase_client.table("user")
        .select("id")
        .eq("email", user["email"])
        .limit(1)
        .execute()
    )
    if not users.data:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return int(users.data[0]["id"])


def get_learning_model() -> tuple[OpenAI, str]:
    return get_openai_client(OpenAIModel(model="deepseek"))


@router.post("", response_model=LearningSessionCreated)
def create_learning_session(
    request: LearningSessionCreate,
    user_id: Annotated[int, Depends(get_current_user_id)],
    supabase_client: Annotated[Client, Depends(get_supabase_client)],
    client_and_model: Annotated[tuple[OpenAI, str], Depends(get_learning_model)],
) -> LearningSessionCreated:
    client, model_name = client_and_model
    try:
        content = generate_lesson(
            client,
            model_name,
            request.course_topic,
            request.presentation_format,
            request.experience_level,
        )
    except OpenAIError as error:
        raise HTTPException(
            status_code=502, detail="Lesson generation failed."
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=502, detail="Lesson generation returned no content."
        ) from error

    response = (
        supabase_client.table("learning_sessions")
        .insert(
            {
                "user_id": user_id,
                "course_topic": request.course_topic,
                "presentation_format": request.presentation_format,
                "experience_level": request.experience_level,
                "status": "ready",
                "content": content,
            }
        )
        .select("id,status")
        .single()
        .execute()
    )
    return LearningSessionCreated.model_validate(response.data)


@router.get("", response_model=list[LearningSessionSummary])
def list_learning_sessions(
    user_id: Annotated[int, Depends(get_current_user_id)],
    supabase_client: Annotated[Client, Depends(get_supabase_client)],
) -> list[LearningSessionSummary]:
    response = (
        supabase_client.table("learning_sessions")
        .select(
            "id,course_topic,presentation_format,experience_level,status,created_at"
        )
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [
        LearningSessionSummary.model_validate(session) for session in response.data
    ]


@router.get("/{session_id}", response_model=LearningSessionResponse)
def get_learning_session(
    session_id: UUID,
    user_id: Annotated[int, Depends(get_current_user_id)],
    supabase_client: Annotated[Client, Depends(get_supabase_client)],
) -> LearningSessionResponse:
    response = (
        supabase_client.table("learning_sessions")
        .select(
            "id,course_topic,presentation_format,experience_level,"
            "learner_background,learning_goal,status,content"
        )
        .eq("id", str(session_id))
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Learning session not found")
    return LearningSessionResponse.model_validate(response.data[0])
