from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from httpx import Client as HttpClient
from supabase import Client

from app.database.supabase import create_user_client
from app.identity.errors import ApiError


def get_optional_auth_client() -> Iterator[Client | None]:
    with HttpClient(timeout=15) as http_client:
        try:
            client = create_user_client(http_client)
        except Exception:
            client = None
        yield client


def get_auth_client(
    client: Annotated[Client | None, Depends(get_optional_auth_client)],
) -> Client:
    if client is None:
        raise ApiError(503, "service_unavailable", "The sign-in service is unavailable.") from None
    return client


ClientDependency = Annotated[Client, Depends(get_auth_client)]
OptionalClientDependency = Annotated[Client | None, Depends(get_optional_auth_client)]