import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
deepseek_base_url = os.getenv("DEEPSEEK_BASE_URL")
deepseek_model = os.getenv("DEEPSEEK_MODEL")

if not deepseek_api_key or not deepseek_base_url or not deepseek_model:
    raise ValueError("Deepseek API key, base URL, and model must be set in environment variables.")


def get_openai_client():
    openai_client = OpenAI(api_key=deepseek_api_key, base_url=deepseek_base_url)
    return openai_client