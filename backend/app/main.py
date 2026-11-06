from fastapi import FastAPI, Depends
from typing import Annotated
from app.services.openai.openai_client import get_openai_client
from openai import OpenAI
app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "OK"}


@app.get("/openai-status")
def openai_status(openai_client: Annotated[OpenAI, Depends(get_openai_client)]):
    try:
        response = openai_client.chat.completions.create(
            model="deepseek-flash",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Hello"},
            ],
            stream=False,
        )
        return response
    except Exception as e:
        return {"status": "Error", "detail": str(e)}
