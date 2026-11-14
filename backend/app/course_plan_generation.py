import json
import logging
import os
import re

from httpx import Client as HttpClient
from pydantic import ValidationError

from app.hallucination.judge import OPENROUTER_CHAT_URL, judge_model, openrouter_key
from app.schemas.course_plan import CourseDraftProposal, CourseDraftRequest

logger = logging.getLogger(__name__)


class CoursePlanGeneratorNotConfiguredError(RuntimeError):
    pass


class CoursePlanGeneratorUnavailableError(RuntimeError):
    pass


def generate_course_proposal(
    request: CourseDraftRequest,
    http_client: HttpClient,
) -> CourseDraftProposal:
    key = openrouter_key()
    if not key:
        raise CoursePlanGeneratorNotConfiguredError

    response = http_client.post(
        OPENROUTER_CHAT_URL,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        json={
            "model": os.getenv("OPENROUTER_COURSE_MODEL") or judge_model(),
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Create a complete, compact mini-course proposal. Return only JSON "
                        "matching this structure: title, description, "
                        "default_presentation_format, and plan. The plan must contain "
                        "overview, target_audience, assumptions, learning_outcomes, "
                        "prerequisites, modules, milestones, and capstone. Use at most "
                        "three modules and two lessons per module. Each lesson must have "
                        "lesson_id, title, purpose, two or three observable objectives, "
                        "key_topics, suggested_activity (title, description, "
                        "presentation_format), completion_check, prerequisite_lesson_ids, "
                        "and optional estimated_minutes. Use only these presentation "
                        "formats: text-and-images, interactive-simulations, "
                        "interactive-role-play-activities, games, animations, slides-based, "
                        "online-coding. Sequence prerequisites before dependent lessons, "
                        "include active practice, scale the scope to the requested time "
                        "budget, and state important assumptions. Do not invent sources."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        request.model_dump(exclude_none=True),
                        ensure_ascii=True,
                    ),
                },
            ],
            "response_format": {"type": "json_object"},
            "max_tokens": 5000,
        },
    )
    if response.status_code != 200:
        logger.warning(
            "Course plan generation provider returned HTTP %s.",
            response.status_code,
        )
        raise CoursePlanGeneratorUnavailableError

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
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", content, flags=re.DOTALL)
            if not match:
                raise ValueError("Provider response did not contain JSON") from None
            parsed = json.loads(match.group(0))
        return CourseDraftProposal.model_validate(parsed)
    except (ValueError, KeyError, TypeError, ValidationError) as error:
        logger.warning("Course plan generation returned invalid content: %s", error)
        raise CoursePlanGeneratorUnavailableError from error
