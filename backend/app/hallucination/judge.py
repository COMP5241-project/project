"""Server-side AI judge for the "Spot the Hallucination" game.

One OpenRouter call per submission grades the student's critique against the
challenge's hidden flaw. The key comes from ``OPENROUTER_API_KEY`` in
``backend/.env`` and never reaches the browser. The model defaults to a
free-tier OpenRouter model (paid models return 403 on credit-less keys) and
can be overridden with ``OPENROUTER_MODEL``.
"""
import json
import os
import re

from httpx import Client as HttpClient
from pydantic import BaseModel

from app.hallucination.challenges import HallucinationChallenge

OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_JUDGE_MODEL = "nvidia/nemotron-3-super-120b-a12b:free"
VALID_RATINGS = ("novice", "developing", "sharp")


class JudgeNotConfiguredError(RuntimeError):
    """The OPENROUTER_API_KEY is missing from the backend environment."""


class JudgeUnavailableError(RuntimeError):
    """The AI provider could not be reached or returned a bad answer."""



class JudgeVerdict(BaseModel):
    score: int
    rating: str
    identified: list[str]
    missed: list[str]
    feedback: str


def judge_model() -> str:
    return os.getenv("OPENROUTER_MODEL") or DEFAULT_JUDGE_MODEL


def openrouter_key() -> str | None:
    key = os.getenv("OPENROUTER_API_KEY")
    return key if key and key.strip() else None


def build_system_prompt(challenge: HallucinationChallenge, tapped_correct_line: bool) -> str:
    numbered_code = "\n".join(f"{index + 1}: {line}" for index, line in enumerate(challenge.code))
    tap_note = (
        "The student correctly tapped this line as suspicious before writing their critique."
        if tapped_correct_line
        else "The student tapped a different line before writing their critique."
    )
    return (
        "You are a friendly but fair grader for \"Spot the Hallucination\", a code-review game "
        "for university students. Many players have NO programming background.\n\n"
        f"The student was shown this {challenge.language} snippet:\n{numbered_code}\n\n"
        f"The ONE real flaw in this snippet is on line {challenge.flaw_line + 1}:\n"
        f"{challenge.flaw_summary}\n\n"
        f"{tap_note}\n\n"
        "Grade the critique in the user message. Rules:\n"
        "- Reward correctly identifying the flaw and explaining its real-world consequence.\n"
        "- Plain-language explanations earn full credit; never require technical jargon.\n"
        "- Do not reward claims about problems that do not exist in the snippet.\n"
        "- Keep feedback encouraging, specific, and addressed directly to the student.\n\n"
        "Respond with ONLY a JSON object - no markdown fences, no commentary - exactly in this "
        'shape:\n{"score": <integer 0-100>, "rating": "novice" | "developing" | "sharp", '
        '"identified": ["<flaw points the student caught>"], '
        '"missed": ["<important points they did not mention>"], '
        '"feedback": "<2-3 encouraging sentences>"}'
    )


def judge_critique(
    challenge: HallucinationChallenge,
    critique: str,
    tapped_line: int,
    http_client: HttpClient,
) -> JudgeVerdict:
    """Grade one critique with a single OpenRouter call. ``tapped_line`` is the
    0-based line index the student flagged. Raises
    JudgeNotConfiguredError when the key is missing and
    JudgeUnavailableError on any upstream failure (network, HTTP error,
    empty or unreadable answer)."""
    tapped_correct_line = tapped_line == challenge.flaw_line
    key = openrouter_key()
    if not key:
        raise JudgeNotConfiguredError("The AI tutor service is not configured.")
    messages = [
        {"role": "system", "content": build_system_prompt(challenge, tapped_correct_line)},
        {"role": "user", "content": critique},
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
    return parse_verdict(content)


def parse_verdict(raw: str) -> JudgeVerdict:
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

    rating = parsed.get("rating")
    if rating not in VALID_RATINGS:
        rating = "sharp" if score >= 75 else "developing" if score >= 45 else "novice"

    feedback = parsed.get("feedback")
    if not isinstance(feedback, str) or not feedback.strip():
        feedback = (
            "Good effort — compare your critique with the revealed flaw, then try the next "
            "challenge."
        )

    return JudgeVerdict(
        score=score,
        rating=rating,
        identified=_to_str_array(parsed.get("identified")),
        missed=_to_str_array(parsed.get("missed")),
        feedback=feedback.strip(),
    )


def _to_str_array(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    out: list[str] = []
    for item in value:
        if isinstance(item, (str, int, float)):
            text = str(item).strip()
            if text:
                out.append(text)
    return out[:5]
