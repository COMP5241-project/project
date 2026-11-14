import json
import logging
import os
import re

from httpx import Client as HttpClient
from pydantic import ValidationError

from app.hallucination.judge import OPENROUTER_CHAT_URL, judge_model, openrouter_key
from app.schemas.course_plan import CourseDraftProposal, CourseDraftRequest

logger = logging.getLogger(__name__)
MAX_GENERATION_ATTEMPTS = 3


class CoursePlanGeneratorNotConfiguredError(RuntimeError):
    pass


class CoursePlanGeneratorUnavailableError(RuntimeError):
    pass


def _validation_feedback(error: ValidationError) -> str:
    details = error.errors(include_input=False, include_url=False)
    return "\n".join(
        f"- {'.'.join(str(part) for part in item['loc'])}: {item['msg']}"
        for item in details
    )


def generate_course_proposal(
    request: CourseDraftRequest,
    http_client: HttpClient,
) -> CourseDraftProposal:
    key = openrouter_key()
    if not key:
        raise CoursePlanGeneratorNotConfiguredError

    system_prompt = (
        "Create a complete, compact mini-course proposal. Return only JSON matching "
        "this structure: title, description, default_presentation_format, and plan. "
        "The plan must contain overview, target_audience, assumptions, "
        "learning_outcomes, prerequisites, modules, milestones, and capstone. "
        "milestones must be an array of strings, and capstone must be a string, "
        "not an object. Use at most three modules and two lessons per module. "
        "Each lesson must have lesson_id, title, purpose, two or three observable "
        "objectives, key_topics, suggested_activity (title, description, "
        "presentation_format), completion_check, prerequisite_lesson_ids, and "
        "optional estimated_minutes. Use only these presentation formats: "
        "text-and-images, interactive-simulations, "
        "interactive-role-play-activities, games, animations, slides-based, "
        "online-coding. Sequence prerequisites before dependent lessons, include "
        "active practice, scale the scope to the requested time budget, and state "
        "important assumptions. Do not invent sources."
    )
    request_message = json.dumps(
        request.model_dump(exclude_none=True),
        ensure_ascii=True,
    )
    retry_content: str | None = None
    retry_feedback = ""

    for attempt in range(1, MAX_GENERATION_ATTEMPTS + 1):
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Course brief (JSON):\n{request_message}"},
        ]
        if retry_feedback:
            if retry_content:
                messages.append({"role": "assistant", "content": retry_content})
            messages.append({
                "role": "user",
                "content": (
                    "Your previous response did not match the required schema. "
                    "Correct it using these validation errors and return the "
                    f"complete corrected proposal as JSON:\n{retry_feedback}"
                ),
            })

        response = http_client.post(
            OPENROUTER_CHAT_URL,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json={
                "model": os.getenv("OPENROUTER_COURSE_MODEL") or judge_model(),
                "messages": messages,
                "response_format": {"type": "json_object"},
                "max_tokens": 5000,
            },
        )
        if response.status_code != 200:
            logger.warning(
                "Course plan generation provider returned HTTP %s (attempt %s/%s).",
                response.status_code,
                attempt,
                MAX_GENERATION_ATTEMPTS,
            )
            raise CoursePlanGeneratorUnavailableError

        content: str | None = None
        try:
            payload = response.json()
            if not isinstance(payload, dict):
                raise ValueError("Provider response was not a JSON object")
            choices = payload.get("choices") or []
            choice = choices[0] if choices else {}
            if not isinstance(choice, dict):
                raise ValueError("Provider response contained an invalid choice")
            message = choice.get("message")
            if not isinstance(message, dict):
                raise ValueError("Provider response contained an invalid message")
            content = message.get("content")
            if not isinstance(content, str) or not content.strip():
                raise ValueError("Provider response did not contain course JSON")
            try:
                parsed = json.loads(content)
            except json.JSONDecodeError as error:
                match = re.search(r"\{.*\}", content, flags=re.DOTALL)
                if not match:
                    raise ValueError(
                        f"Response was not valid JSON at line {error.lineno}, "
                        f"column {error.colno}."
                    ) from error
                parsed = json.loads(match.group(0))
            return CourseDraftProposal.model_validate(parsed)
        except ValidationError as error:
            retry_feedback = _validation_feedback(error)
            retry_content = content if isinstance(content, str) else None
        except (ValueError, KeyError, TypeError) as error:
            retry_feedback = f"- response: {error}"
            retry_content = content if isinstance(content, str) else None

        logger.warning(
            "Course plan generation response failed validation (attempt %s/%s): %s",
            attempt,
            MAX_GENERATION_ATTEMPTS,
            retry_feedback,
        )
        if attempt < MAX_GENERATION_ATTEMPTS:
            continue

    raise CoursePlanGeneratorUnavailableError
