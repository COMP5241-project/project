from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI, OpenAIError
from pydantic import BaseModel, Field, model_validator
from supabase import Client

from app.database.supabase import get_supabase_client
from app.routes.learning_sessions import get_current_user_id
from app.services.learning_path_design import generate_design_reply
from app.services.openai.openai_client import OpenAIModel, get_openai_client

router = APIRouter(prefix="/api/v1/learning-path-design", tags=["learning path design"])


class DesignChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class SourceMaterial(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    content: str = Field(max_length=10000)


class DesignChatRequest(BaseModel):
    messages: list[DesignChatMessage] = Field(min_length=1, max_length=30)
    source_materials: list[SourceMaterial] = Field(default_factory=list, max_length=5)

    @model_validator(mode="after")
    def latest_message_must_be_from_learner(self) -> "DesignChatRequest":
        if self.messages[-1].role != "user":
            raise ValueError("The latest message must be from the learner.")
        if sum(len(material.content) for material in self.source_materials) > 50000:
            raise ValueError("Source materials must total 50,000 characters or less.")
        return self


class DesignChatResponse(BaseModel):
    message: str
    learning_prompt_draft: str


class LearningPathCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    learning_prompt: str = Field(min_length=1, max_length=50000)
    presentation_format: Literal["text-and-images"] = "text-and-images"
    experience_level: Literal["beginner", "intermediate"] = "beginner"

    @model_validator(mode="after")
    def content_must_not_be_blank(self) -> "LearningPathCreateRequest":
        if not self.title.strip():
            raise ValueError("The course title must not be blank.")
        if not self.learning_prompt.strip():
            raise ValueError("The learning prompt must not be blank.")
        return self


class LearningPathCreatedResponse(BaseModel):
    course_id: UUID
    session_id: UUID


def get_design_model() -> tuple[OpenAI, str]:
    return get_openai_client(OpenAIModel(model="deepseek"))


@router.post("/chat", response_model=DesignChatResponse)
def chat_about_learning_path(
    request: DesignChatRequest,
    _user_id: Annotated[int, Depends(get_current_user_id)],
    client_and_model: Annotated[tuple[OpenAI, str], Depends(get_design_model)],
) -> DesignChatResponse:
    client, model_name = client_and_model
    try:
        message, learning_prompt_draft = generate_design_reply(
            client,
            model_name,
            [message.model_dump() for message in request.messages],
            [material.model_dump() for material in request.source_materials],
        )
    except OpenAIError as error:
        raise HTTPException(
            status_code=502, detail="The learning path designer is unavailable."
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=502,
            detail="The learning path designer returned an invalid response.",
        ) from error

    return DesignChatResponse(
        message=message,
        learning_prompt_draft=learning_prompt_draft,
    )


@router.post("/create", response_model=LearningPathCreatedResponse)
def create_learning_path(
    request: LearningPathCreateRequest,
    user_id: Annotated[int, Depends(get_current_user_id)],
    supabase_client: Annotated[Client, Depends(get_supabase_client)],
) -> LearningPathCreatedResponse:
    response = supabase_client.rpc(
        "create_personalized_learning_session",
        {
            "p_user_id": user_id,
            "p_title": request.title.strip(),
            "p_description": request.title.strip(),
            "p_prompt": request.learning_prompt.strip(),
            "p_presentation_format": request.presentation_format,
            "p_experience_level": request.experience_level,
        },
    ).execute()
    if not response.data:
        raise HTTPException(
            status_code=500, detail="Unable to create the learning path."
        )
    created = response.data[0]
    return LearningPathCreatedResponse(
        course_id=created["course_id"],
        session_id=created["session_id"],
    )
