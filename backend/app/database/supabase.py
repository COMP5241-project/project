import os
from functools import lru_cache

from dotenv import load_dotenv
from httpx import Client as HttpClient
from supabase import Client, ClientOptions, create_client

load_dotenv()

@lru_cache(maxsize=1)
def get_supabase() -> Client:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set")

    return create_client(supabase_url, supabase_key)


def create_user_client(http_client: HttpClient) -> Client:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set")
    return create_client(
        supabase_url,
        supabase_key,
        options=ClientOptions(
            auto_refresh_token=False, persist_session=False, httpx_client=http_client,
        ),
    )