from fastapi import FastAPI, Depends
from typing import Annotated
from supabase import Client
from app.services.openai.openai_client import get_openai_client
from openai import OpenAI
from app.database.supabase import get_supabase_client

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "OK"}


@app.get("/health")
def health(supabase_client: Annotated[Client, Depends(get_supabase_client)]):
    try:
        # Perform a simple query to check the database connection
        response = supabase_client.table("user").select("*").execute()
        return {"status": "OK", "detail": response}
    except Exception as e:
        return {"status": "Error", "detail": str(e)}


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
