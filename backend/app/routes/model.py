from fastapi import APIRouter, Depends
from openai import OpenAI
from dotenv import load_dotenv
import os
from typing import Annotated
from app.services.openai.openai_client import get_openai_client

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


router = APIRouter(prefix="/api/v1/model", tags=["model"])


@router.get("/deepseek")
def deepseek_status(
    openai_client: Annotated[
        OpenAI, Depends(lambda: get_openai_client(deepseek_api_key, deepseek_base_url))
    ],
):
    try:
        response = openai_client.chat.completions.create(
            model=deepseek_model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Hello"},
            ],
            stream=False,
        )
        return response
    except Exception as e:
        return {"status": "Error", "detail": str(e)}


@router.get("/kimi")
def kimi_status(
    openai_client: Annotated[
        OpenAI, Depends(lambda: get_openai_client(kimi_api_key, kimi_base_url))
    ],
):
    try:
        response = openai_client.chat.completions.create(
            model=kimi_model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Hello"},
            ],
            stream=False,
        )
        return response
    except Exception as e:
        return {"status": "Error", "detail": str(e)}
