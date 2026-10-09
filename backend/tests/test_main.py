from collections.abc import Iterator
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from httpx import Client as HttpxClient

from app.database.supabase import get_supabase
from app.main import app


@pytest.fixture
def mock_supabase() -> Mock:
    return Mock()


@pytest.fixture
def client(mock_supabase: Mock) -> Iterator[HttpxClient]:
    app.dependency_overrides[get_supabase] = lambda: mock_supabase
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_root_returns_greeting(client: HttpxClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "Hello"}


def test_health_returns_ok_when_supabase_query_succeeds(
    client: HttpxClient, mock_supabase: Mock
) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    mock_supabase.table.assert_called_once_with("profiles")
    mock_supabase.table.return_value.select.assert_called_once_with("*")
    mock_supabase.table.return_value.select.return_value.limit.assert_called_once_with(1)
    mock_supabase.table.return_value.select.return_value.limit.return_value.execute.assert_called_once()


def test_health_returns_service_unavailable_when_supabase_query_fails(
    client: HttpxClient, mock_supabase: Mock
) -> None:
    execute = mock_supabase.table.return_value.select.return_value.limit.return_value.execute
    execute.side_effect = RuntimeError("database unavailable")

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json() == {
        "status": "error",
        "message": "database unavailable",
    }