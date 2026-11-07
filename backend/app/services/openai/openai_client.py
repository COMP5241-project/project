from openai import OpenAI
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Literal

load_dotenv()

deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
deepseek_base_url = os.getenv("DEEPSEEK_BASE_URL")
deepseek_model = os.getenv("DEEPSEEK_MODEL")

if not deepseek_api_key or not deepseek_base_url or not deepseek_model:
    raise ValueError(
        "Deepseek API key, base URL, and model must be set in environment variables."
    )


kimi_api_key = os.getenv("KIMI_API_KEY")
kimi_base_url = os.getenv("KIMI_BASE_URL")
kimi_model = os.getenv("KIMI_MODEL")

if not kimi_api_key or not kimi_base_url or not kimi_model:
    raise ValueError(
        "Kimi API key, base URL, and model must be set in environment variables."
    )


class OpenAIModel(BaseModel):
    model: Literal["deepseek", "kimi"]


def get_openai_client(model: OpenAIModel) -> tuple[OpenAI, str]:
    if model.model == "deepseek":
        api_key = deepseek_api_key
        base_url = deepseek_base_url
        model_name = deepseek_model
    elif model.model == "kimi":
        api_key = kimi_api_key
        base_url = kimi_base_url
        model_name = kimi_model
    else:
        raise ValueError("Invalid model specified.")

    openai_client = OpenAI(api_key=api_key, base_url=base_url)
    return openai_client, model_name