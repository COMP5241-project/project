"""Server-side AI tutor for the sample mini-course's free-response moments.

One OpenRouter call per submission grades the learner's answer against the
moment's hidden rubric. Key and model plumbing is shared with the
Spot-the-Hallucination judge; only the prompts and the verdict shape differ.
"""
import json
import re

from httpx import Client as HttpClient
from pydantic import BaseModel

from app.hallucination.judge import (
    OPENROUTER_CHAT_URL,
    JudgeNotConfiguredError,
    JudgeUnavailableError,
    judge_model,
    openrouter_key,
)

__all__ = [
    "JudgeNotConfiguredError",
    "JudgeUnavailableError",
    "TutorVerdict",
    "judge_answer",
]


class TutorVerdict(BaseModel):
    score: int
    feedback: str


def judge_answer(system_prompt: str, answer: str, http_client: HttpClient) -> TutorVerdict:
    """Grade one answer with a single OpenRouter call. Raises
    JudgeNotConfiguredError when the key is missing and JudgeUnavailableError
    on any upstream failure (network, HTTP error, empty or unreadable
    answer)."""
    key = openrouter_key()
    if not key:
        raise JudgeNotConfiguredError("The AI tutor service is not configured.")
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": answer},
    ]
    try:
        response = http_client.post(
            OPENROUTER_CHAT_URL,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json={"model": judge_model(), "messages": messages},
        )
    except Exception:
        raise JudgeUnavailableError("Unable to reach the AI tutor service.") from None
    if response.status_code != 200:
        raise JudgeUnavailableError(f"The AI tutor service returned an error ({response.status_code}).")
    try:
        payload = response.json()
    except Exception:
        raise JudgeUnavailableError("The AI tutor returned an unreadable answer.") from None
    choices = payload.get("choices") or []
    content = choices[0].get("message", {}).get("content") if choices else None
    if not isinstance(content, str) or not content.strip():
        raise JudgeUnavailableError("The AI tutor returned an empty response.")
    return parse_tutor_verdict(content)


def parse_tutor_verdict(raw: str) -> TutorVerdict:
    """Defensive parser: tolerates stray text around the JSON and missing fields."""
    parsed: object
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, flags=re.DOTALL)
        if not match:
            raise JudgeUnavailableError("The AI tutor returned an unreadable verdict.") from None
        try:
            parsed = json.loads(match.group(0))
        except json.JSONDecodeError:
            raise JudgeUnavailableError("The AI tutor returned an unreadable verdict.") from None

    if not isinstance(parsed, dict):
        raise JudgeUnavailableError("The AI tutor returned an unreadable verdict.")

    score_value = parsed.get("score")
    try:
        score = int(round(float(score_value)))
    except (TypeError, ValueError):
        score = 0
    score = max(0, min(100, score))

    feedback = parsed.get("feedback")
    if not isinstance(feedback, str) or not feedback.strip():
        feedback = (
            "Good effort — the key ideas are on the screen below. Compare them with your "
            "answer, then keep going."
        )

    return TutorVerdict(score=score, feedback=feedback.strip())