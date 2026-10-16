import json
import os
import re
from typing import Annotated, Literal, Union

from httpx import Client as HttpClient
from pydantic import BaseModel, Field, ValidationError, model_validator

from app.hallucination.judge import (
    OPENROUTER_CHAT_URL,
    judge_model,
    openrouter_key,
)


class CourseGeneratorNotConfiguredError(RuntimeError):
    """The course generator has no OpenRouter API key."""


class CourseGeneratorUnavailableError(RuntimeError):
    """The OpenRouter course-generation request failed or returned invalid content."""


class SlideVisual(BaseModel):
    kind: Literal["diagram", "photo"] = "diagram"
    description: str = Field(default="Key ideas and their relationship", min_length=1, max_length=500)
    steps: list[Annotated[str, Field(min_length=1, max_length=200)]] = Field(
        default_factory=lambda: ["Concept", "Application"], max_length=6
    )


class SlideTheme(BaseModel):
    background: str = Field(min_length=1, max_length=64)
    text_color: str = Field(alias="textColor", min_length=1, max_length=64)
    accent_color: str = Field(alias="accentColor", min_length=1, max_length=64)
    card_background: str | None = Field(default=None, alias="cardBackground", max_length=64)

    model_config = {"populate_by_name": True}


class GeneratedSlide(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    bullets: list[Annotated[str, Field(min_length=1, max_length=1000)]] = Field(
        min_length=1, max_length=10
    )
    visual: SlideVisual = Field(default_factory=SlideVisual)
    theme: SlideTheme | None = None


class GeneratedCourseContent(BaseModel):
    type: Literal["slides"]
    content: list[GeneratedSlide] = Field(min_length=1, max_length=20)


class GeneratedQuizQuestion(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    question: str = Field(min_length=1, max_length=1000)
    options: list[Annotated[str, Field(min_length=1, max_length=500)]] = Field(
        min_length=2, max_length=6
    )
    correct_answer_index: int = Field(alias="correctAnswerIndex", ge=0, le=5)
    explanation: str | None = Field(default=None, max_length=2000)

    model_config = {"populate_by_name": True}

    @model_validator(mode="after")
    def correct_answer_exists(self) -> "GeneratedQuizQuestion":
        if self.correct_answer_index >= len(self.options):
            raise ValueError("correctAnswerIndex must refer to an existing option")
        return self


class GeneratedQuizContent(BaseModel):
    type: Literal["quiz"]
    questions: list[GeneratedQuizQuestion] = Field(min_length=1, max_length=50)


GeneratedArtifactContent = Annotated[
    Union[GeneratedCourseContent, GeneratedQuizContent],
    Field(discriminator="type"),
]


def course_generation_model() -> str:
    return os.getenv("OPENROUTER_COURSE_MODEL") or judge_model()


def generate_course_content(
    prompt: str,
    source_context: str,
    http_client: HttpClient,
    *,
    artifact_type: Literal["slides", "quiz"] = "slides",
    existing_content: GeneratedArtifactContent | None = None,
    revision_prompt: str | None = None,
) -> GeneratedArtifactContent:
    key = openrouter_key()
    if not key:
        raise CourseGeneratorNotConfiguredError("The AI course generator is not configured.")

    if artifact_type == "quiz":
        system_prompt = (
            "Create accurate university-level multiple-choice quiz questions. Use the supplied "
            "sources as context, do not invent source-specific facts, and respond only as JSON "
            'with shape {"type":"quiz","questions":[{"id":"q1","question":"Question text",'
            '"options":["First option","Second option","Third option","Fourth option"],'
            '"correctAnswerIndex":0,"explanation":"Why the correct option is right."}]}. '
            "Include four distinct options for each question, in A/B/C/D order, and a clear explanation."
        )
        invalid_content_message = "The AI course generator returned invalid quiz content."
        artifact_label = "quiz"
    else:
        system_prompt = (
            "Create concise, accurate educational course slides for a university instructor. "
            "Use the supplied sources as context, do not invent source-specific facts, and "
            "respond only as JSON with shape "
            '{"type":"slides","content":[{"title":"Slide title","bullets":["Point"],'
            '"visual":{"kind":"diagram","description":"How the concepts relate",'
            '"steps":["First","Next","Result"]},"theme":{"background":"#ffffff",'
            '"textColor":"#0f172a","accentColor":"#A21942",'
            '"cardBackground":"#F8FAFC"}}]}. Every slide must have a visual and a theme. '
            "Extract any requested aesthetic or color palette and apply it consistently "
            "to every slide's theme. For a dark blue theme, use colors such as "
            '{"background":"#0B192C","textColor":"#F8FAFC","accentColor":"#38BDF8",'
            '"cardBackground":"#1E293B"}. '
            "Prefer a clear diagram with 2-5 short steps; use kind photo only when a "
            "photograph would communicate the topic better, and give a specific description "
            "for an instructor-supplied photo."
        )
        invalid_content_message = "The AI course generator returned invalid slide content."
        artifact_label = "slide deck"

    messages = [
        {
            "role": "system",
            "content": system_prompt,
        },
        {
            "role": "user",
            "content": (
                f"Instructor request:\n{prompt or f'Refine the current {artifact_label} using the revision instructions.'}"
                f"\n\nRevision instructions:\n{revision_prompt or f'Create the initial {artifact_label}.'}"
                f"\n\nExisting resource:\n{existing_content.model_dump_json(by_alias=True) if existing_content else 'No existing resource.'}"
                f"\n\nKnowledge sources:\n{source_context or 'No sources have been added.'}"
            ),
        },
    ]
    try:
        response = http_client.post(
            OPENROUTER_CHAT_URL,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json={
                "model": course_generation_model(),
                "messages": messages,
                "response_format": {"type": "json_object"},
                "max_tokens": 3000,
            },
        )
    except Exception:
        raise CourseGeneratorUnavailableError("Unable to reach the AI course generator.") from None
    if response.status_code != 200:
        raise CourseGeneratorUnavailableError(
            f"The AI course generator returned an error ({response.status_code})."
        )
    try:
        payload = response.json()
        choices = payload.get("choices") or []
        content = choices[0].get("message", {}).get("content") if choices else None
        if not isinstance(content, str) or not content.strip():
            raise ValueError("Empty response")
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", content, flags=re.DOTALL)
            if not match:
                raise ValueError("No JSON response") from None
            parsed = json.loads(match.group(0))
        model = GeneratedQuizContent if artifact_type == "quiz" else GeneratedCourseContent
        return model.model_validate(parsed)
    except (ValueError, TypeError, KeyError, IndexError, AttributeError, ValidationError):
        raise CourseGeneratorUnavailableError(
            invalid_content_message
        ) from None
