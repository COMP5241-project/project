import re
from typing import Literal

from fastapi import APIRouter, Request
from httpx import Client as HttpClient
from pydantic import BaseModel, Field, model_validator

from app.course_generation import (
    CourseGeneratorNotConfiguredError,
    CourseGeneratorUnavailableError,
    GeneratedArtifactContent,
    generate_course_content,
)
from app.identity.auth import OptionalClientDependency
from app.identity.errors import ApiError
from app.identity.profiles import load_profile
from app.identity.sessions import StoreDependency, verified_session

router = APIRouter(prefix="/api/instructor")

QUIZ_INTENT = re.compile(r"\b(?:quiz|mc)\b|multiple[\s-]+choice", re.IGNORECASE)


class CourseGenerationRequest(BaseModel):
    prompt: str = Field(default="", max_length=4000)
    source_context: str = Field(default="", max_length=20000)
    artifact_type: Literal["slides", "quiz"] = "slides"
    existing_content: GeneratedArtifactContent | None = None
    revision_prompt: str = Field(default="", max_length=4000)

    @model_validator(mode="before")
    @classmethod
    def infer_quiz_intent(cls, values: object) -> object:
        if isinstance(values, dict):
            prompt = str(values.get("prompt", ""))
            revision_prompt = str(values.get("revision_prompt", ""))
            if QUIZ_INTENT.search(f"{prompt}\n{revision_prompt}"):
                values = {**values, "artifact_type": "quiz"}
        return values

    @model_validator(mode="after")
    def existing_content_matches_type(self) -> "CourseGenerationRequest":
        if self.existing_content and self.existing_content.type != self.artifact_type:
            raise ValueError("existing_content must match artifact_type")
        return self


@router.post("/generate", response_model=GeneratedArtifactContent)
def generate_course(
    payload: CourseGenerationRequest,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
) -> GeneratedArtifactContent:
    if not payload.prompt.strip() and not payload.revision_prompt.strip():
        raise ApiError(422, "invalid_request", "Enter a prompt to create or revise this resource.")
    with verified_session(request, client, store) as (session, user):
        assert client is not None
        profile = load_profile(client, user.id, user.email, session.access_token).profile
        if profile.role != "instructor":
            raise ApiError(
                403, "instructor_required", "Only instructors can generate course content."
            )
        try:
            with HttpClient(timeout=60) as http_client:
                return generate_course_content(
                    payload.prompt,
                    payload.source_context,
                    http_client,
                    artifact_type=payload.artifact_type,
                    existing_content=payload.existing_content,
                    revision_prompt=payload.revision_prompt,
                )
        except CourseGeneratorNotConfiguredError:
            raise ApiError(
                503,
                "course_generator_unavailable",
                "The AI course generator is not configured. Ask your administrator to enable it.",
            ) from None
        except CourseGeneratorUnavailableError:
            raise ApiError(
                503,
                "course_generator_unavailable",
                "The AI course generator is unavailable. Please try again later.",
            ) from None
