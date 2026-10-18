from collections.abc import Iterator
from types import SimpleNamespace
import time
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from httpx import Client as HttpxClient

from app.database.supabase import get_supabase
from app.identity.auth import get_auth_client, get_optional_auth_client
from app.identity.sessions import SessionStore, get_session_store
from app.main import app
from app.sample_course.quota import GUEST_COOKIE, SampleQuotaStore, get_sample_quota_store
from app.sample_course.tutor import JudgeUnavailableError, TutorVerdict


@pytest.fixture
def mock_supabase() -> Mock:
    return Mock()


@pytest.fixture
def auth_client() -> Mock:
    client = Mock()
    client.options.headers = {}
    user = SimpleNamespace(id="student-id", email="student@example.com")
    session = SimpleNamespace(
        access_token="private-access-token", refresh_token="private-refresh-token",
        expires_at=time.time() + 3600, expires_in=3600,
    )
    client.auth.sign_in_with_password.return_value = SimpleNamespace(user=user, session=session)
    client.auth.refresh_session.return_value = SimpleNamespace(user=user, session=session)
    client.auth.get_user.return_value = SimpleNamespace(user=user)
    client.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": user.id, "email": user.email, "role": "student",
        "cs_qualified": True, "assessment_completed": True,
    }
    return client


@pytest.fixture
def store() -> SessionStore:
    return SessionStore()


@pytest.fixture
def quota_store() -> SampleQuotaStore:
    return SampleQuotaStore()


@pytest.fixture
def client(
    mock_supabase: Mock, auth_client: Mock, store: SessionStore, quota_store: SampleQuotaStore,
) -> Iterator[HttpxClient]:
    app.dependency_overrides[get_supabase] = lambda: mock_supabase
    app.dependency_overrides[get_auth_client] = lambda: auth_client
    app.dependency_overrides[get_optional_auth_client] = lambda: auth_client
    app.dependency_overrides[get_session_store] = lambda: store
    app.dependency_overrides[get_sample_quota_store] = lambda: quota_store
    with TestClient(app) as test_client:
        test_client.headers["Origin"] = "http://localhost:5173"
        yield test_client
    app.dependency_overrides.clear()


def auth_login(client: HttpxClient):
    return client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": "secret-password"},
    )


TUTOR_PAYLOAD = {"moment_id": "prompt-compare", "answer": "It said who rides what and how."}


def test_content_hides_answer_keys(client: HttpxClient) -> None:
    response = client.get("/api/sample-course/content")

    assert response.status_code == 200
    body = response.json()
    assert body["title"].startswith("Fundamentals")
    assert body["tutor_moments"] == 2
    assert body["decisions"] and body["slides"] and body["quiz"]
    for question in body["quiz"]:
        assert "correct_index" not in question
        assert "explanation" not in question
    for decision in body["decisions"]:
        for option in decision["options"]:
            assert "correct" not in option
            assert "feedback" not in option
    for bot_input in body["bot"]["inputs"]:
        assert "kind" not in bot_input
        assert "reaction" not in bot_input
        assert "lesson" not in bot_input
    assert "key_points" not in body["prompt_compare"]
    assert "key_points" not in body["reflection"]


def test_answer_decision_checks_choice(client: HttpxClient) -> None:
    correct = client.post(
        "/api/sample-course/answer", json={"moment_id": "sim-1", "choice": "sim-1-reqs"}
    )
    assert correct.status_code == 200
    assert correct.json()["type"] == "decision"
    assert correct.json()["correct"] is True
    assert correct.json()["feedback"]

    wrong = client.post(
        "/api/sample-course/answer", json={"moment_id": "sim-2", "choice": "sim-2-ship"}
    )
    assert wrong.status_code == 200
    assert wrong.json()["type"] == "decision"
    assert wrong.json()["correct"] is False

    unknown = client.post(
        "/api/sample-course/answer", json={"moment_id": "sim-1", "choice": "sim-2-ship"}
    )
    assert unknown.status_code == 404

def test_answer_quiz_reveals_explanation_only_after_submit(client: HttpxClient) -> None:
    response = client.post(
        "/api/sample-course/answer", json={"moment_id": "quiz-1", "choice": "1"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "quiz"
    assert body["correct"] is True
    assert body["correct_index"] == 1
    assert body["explanation"]

    wrong = client.post(
        "/api/sample-course/answer", json={"moment_id": "quiz-1", "choice": "0"}
    )
    assert wrong.json()["correct"] is False
    out_of_range = client.post(
        "/api/sample-course/answer", json={"moment_id": "quiz-1", "choice": "99"}
    )
    assert out_of_range.status_code == 404


def test_answer_bot_reveals_reaction_and_lesson(client: HttpxClient) -> None:
    flaw = client.post(
        "/api/sample-course/answer", json={"moment_id": "bot", "choice": "flaw-negative"}
    )
    assert flaw.status_code == 200
    assert flaw.json()["type"] == "bot"
    assert flaw.json()["kind"] == "flaw"
    assert flaw.json()["lesson"]

    near = client.post(
        "/api/sample-course/answer", json={"moment_id": "bot", "choice": "near-sql"}
    )
    assert near.json()["kind"] == "near_miss"
    assert near.json()["lesson"] is None


def test_answer_rejects_unknown_moment(client: HttpxClient) -> None:
    response = client.post(
        "/api/sample-course/answer", json={"moment_id": "nope", "choice": "x"}
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "moment_not_found"


def test_tutor_guest_budget_is_two_uses(client: HttpxClient, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.routers.sample_course.judge_answer",
        lambda *args, **kwargs: TutorVerdict(score=80, feedback="Nice thinking."),
    )
    first = client.post("/api/sample-course/tutor", json=TUTOR_PAYLOAD)
    assert first.status_code == 200
    body = first.json()
    assert body["score"] == 80
    assert body["key_points"]
    assert body["remaining_uses"] == 1
    assert client.cookies.get(GUEST_COOKIE)

    second = client.post(
        "/api/sample-course/tutor",
        json={"moment_id": "reflection", "answer": "I will review everything AI gives me."},
    )
    assert second.json()["remaining_uses"] == 0

    third = client.post("/api/sample-course/tutor", json=TUTOR_PAYLOAD)
    assert third.status_code == 429
    assert third.json()["error"]["code"] == "tutor_quota_exceeded"


def test_tutor_student_gets_three_tries_per_moment(client: HttpxClient, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.routers.sample_course.judge_answer",
        lambda *args, **kwargs: TutorVerdict(score=70, feedback="Solid."),
    )
    auth_login(client)
    for expected_remaining in (2, 1, 0):
        response = client.post("/api/sample-course/tutor", json=TUTOR_PAYLOAD)
        assert response.status_code == 200
        assert response.json()["remaining_uses"] == expected_remaining

    exhausted = client.post("/api/sample-course/tutor", json=TUTOR_PAYLOAD)
    assert exhausted.status_code == 429

    other_moment = client.post(
        "/api/sample-course/tutor",
        json={"moment_id": "reflection", "answer": "I will review everything AI gives me."},
    )
    assert other_moment.status_code == 200
    assert other_moment.json()["remaining_uses"] == 2


def test_tutor_outage_refunds_guest_quota(client: HttpxClient, monkeypatch) -> None:
    calls = {"count": 0}

    def flaky(*args, **kwargs):
        calls["count"] += 1
        if calls["count"] == 1:
            raise JudgeUnavailableError("boom")
        return TutorVerdict(score=55, feedback="Recovered nicely.")

    monkeypatch.setattr("app.routers.sample_course.judge_answer", flaky)

    failed = client.post("/api/sample-course/tutor", json=TUTOR_PAYLOAD)
    assert failed.status_code == 503
    assert failed.json()["error"]["code"] == "tutor_unavailable"

    recovered = client.post("/api/sample-course/tutor", json=TUTOR_PAYLOAD)
    assert recovered.status_code == 200
    # The failed call must not have consumed one of the guest's two uses.
    assert recovered.json()["remaining_uses"] == 1


def test_tutor_rejects_short_or_unknown_input(client: HttpxClient) -> None:
    too_short = client.post(
        "/api/sample-course/tutor",
        json={"moment_id": "prompt-compare", "answer": "too short"},
    )
    assert too_short.status_code == 422

    unknown = client.post(
        "/api/sample-course/tutor",
        json={"moment_id": "nope", "answer": "A perfectly valid length answer."},
    )
    assert unknown.status_code == 404


def test_sample_course_result_requires_session(client: HttpxClient) -> None:
    response = client.post("/api/profiles/sample-course-results", json={
        "overall_score": 80, "simulation_score": 100, "quiz_score": 67, "bot_score": 100,
    })
    assert response.status_code == 401


def test_sample_course_result_inserts_for_student(
    client: HttpxClient, auth_client: Mock
) -> None:
    auth_login(client)
    response = client.post("/api/profiles/sample-course-results", json={
        "overall_score": 80, "simulation_score": 100, "quiz_score": 67, "bot_score": 100,
        "prompt_compare_score": 75, "reflection_score": None,
    })
    assert response.status_code == 204
    auth_client.table.assert_called_with("sample_course_results")
    insert_payload = auth_client.table.return_value.insert.call_args.args[0]
    assert insert_payload["user_id"] == "student-id"
    assert insert_payload["overall_score"] == 80
    assert insert_payload["reflection_score"] is None