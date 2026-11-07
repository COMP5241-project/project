from pathlib import Path

from openai import OpenAI

DESIGN_PROMPT_PATH = (
    Path(__file__).resolve().parents[2] / "design-my-own-learning-course.md"
)

DESIGN_PROMPT_DEFAULTS = {
    "{{learning_topic}}": "not provided yet; learn through the conversation",
    "{{learning_goal}}": "not provided yet; learn through the conversation",
    "{{experience_level}}": "not provided yet; learn through the conversation",
    "{{learner_background}}": "not provided yet; learn through the conversation",
    "{{presentation_format}}": "not provided yet; default to text and images",
    "{{time_budget}}": "not provided yet; learn through the conversation",
    "{{requirements_or_source_material}}": "not provided yet; learn through the conversation",
}


def load_design_system_prompt() -> str:
    prompt = DESIGN_PROMPT_PATH.read_text(encoding="utf-8")
    for placeholder, value in DESIGN_PROMPT_DEFAULTS.items():
        prompt = prompt.replace(placeholder, value)
    return prompt


def generate_design_reply(
    client: OpenAI,
    model_name: str,
    messages: list[dict[str, str]],
) -> str:
    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": load_design_system_prompt()},
            *messages,
        ],
        stream=False,
    )
    if not response.choices:
        raise ValueError("The learning path designer returned no choices.")
    content = response.choices[0].message.content
    if not content or not content.strip():
        raise ValueError("The learning path designer returned empty content.")
    return content
