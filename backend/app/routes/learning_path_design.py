from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI, OpenAIError
from pydantic import BaseModel, Field, model_validator

from app.routes.learning_sessions import get_current_user_id
from app.services.learning_path_design import generate_design_reply
from app.services.openai.openai_client import OpenAIModel, get_openai_client

router = APIRouter(prefix="/api/v1/learning-path-design", tags=["learning path design"])


class DesignChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class DesignChatRequest(BaseModel):
    messages: list[DesignChatMessage] = Field(min_length=1, max_length=30)

    @model_validator(mode="after")
    def latest_message_must_be_from_learner(self) -> "DesignChatRequest":
        if self.messages[-1].role != "user":
            raise ValueError("The latest message must be from the learner.")
        return self


class DesignChatResponse(BaseModel):
    message: str


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
        reply = generate_design_reply(
            client,
            model_name,
            [message.model_dump() for message in request.messages],
        )
    except OpenAIError as error:
        raise HTTPException(
            status_code=502, detail="The learning path designer is unavailable."
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=502, detail="The learning path designer returned no content."
        ) from error

    return DesignChatResponse(message=reply)
