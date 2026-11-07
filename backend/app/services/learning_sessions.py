from pathlib import Path

from openai import OpenAI

SYSTEM_PROMPT_PATH = (
    Path(__file__).resolve().parents[2] / "learning-content-system-prompt.md"
)

PRESENTATION_FORMATS = {
    "text-and-images": "Text and images",
    "interactive-simulations": "Interactive simulation",
    "interactive-role-play-activities": "Interactive role-play activities",
    "games": "Game or mini-game",
    "animations": "Animation",
    "slides-based": "Slides",
    "online-coding": "Online coding",
}


def load_system_prompt(
    course_topic: str,
    presentation_format: str,
    experience_level: str,
) -> str:
    prompt = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
    replacements = {
        "{{course_topic}}": course_topic,
        "{{presentation_format}}": PRESENTATION_FORMATS[presentation_format],
        "{{experience_level}}": experience_level,
        "{{learner_background}}": "unspecified",
        "{{learning_goal}}": "unspecified",
        "{{requirements_or_source_material}}": "unspecified",
    }
    for placeholder, value in replacements.items():
        prompt = prompt.replace(placeholder, value)
    return prompt


def generate_lesson(
    client: OpenAI,
    model_name: str,
    course_topic: str,
    presentation_format: str,
    experience_level: str,
) -> str:
    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {
                "role": "system",
                "content": load_system_prompt(
                    course_topic, presentation_format, experience_level
                ),
            },
            {"role": "user", "content": "Create the lesson now."},
        ],
        stream=False,
    )
    if not response.choices:
        raise ValueError("The lesson provider returned no choices.")
    content = response.choices[0].message.content
    if not content or not content.strip():
        raise ValueError("The lesson provider returned empty content.")
    return content
