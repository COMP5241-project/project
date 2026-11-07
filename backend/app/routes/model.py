from fastapi import APIRouter, Depends
from openai import OpenAI
from typing import Annotated
from app.services.openai.openai_client import OpenAIModel, get_openai_client

router = APIRouter(prefix="/api/v1/model", tags=["model"])


@router.get("/deepseek")
def deepseek_status(
    client_and_model: Annotated[
        tuple[OpenAI, str],
        Depends(lambda: get_openai_client(OpenAIModel(model="deepseek"))),
    ],
):
    openai_client, model_name = client_and_model
    try:
        response = openai_client.chat.completions.create(
            model=model_name,
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
    client_and_model: Annotated[
        tuple[OpenAI, str],
        Depends(lambda: get_openai_client(OpenAIModel(model="kimi"))),
    ],
):
    openai_client, model_name = client_and_model
    try:
        response = openai_client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Hello"},
            ],
            stream=False,
        )
        return response
    except Exception as e:
        return {"status": "Error", "detail": str(e)}
