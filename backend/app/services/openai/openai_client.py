from openai import OpenAI


def get_openai_client(api_key: str, base_url: str) -> OpenAI:
    openai_client = OpenAI(api_key=api_key, base_url=base_url)
    return openai_client
