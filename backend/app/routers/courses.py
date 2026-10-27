"""Student course delivery: published instructor materials, server-checked
quiz answers, and per-student progress tracking.

Quiz answer keys never reach the student client: question projections omit
``correctAnswerIndex``/``explanation`` until the answer is checked, and the
check itself happens here, where the stored material is authoritative.
"""

import logging
from collections.abc import Generator
from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field
from supabase import Client

from app.identity.auth import OptionalClientDependency
from app.identity.errors import ApiError
from app.identity.profiles import load_profile
from app.identity.sessions import StoreDependency, verified_session

router = APIRouter(prefix="/api/courses")
logger = logging.getLogger(__name__)


class CourseSummary(BaseModel):
    id: str
    title: str
    type: str
    published_at: str | None = Field(default=None, alias="publishedAt")

    model_config = ConfigDict(populate_by_name=True)


class CourseAnswerIn(BaseModel):
    question_id: str = Field(min_length=1, max_length=120)
    selected_index: int = Field(ge=0, le=5)


class CourseProgressIn(BaseModel):
    event: Literal["start", "complete"]


def _require_student(
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
) -> Generator[tuple[str, Client], None, None]:
    with verified_session(request, client, store) as (session, user):
        assert client is not None
        profile = load_profile(client, user.id, user.email, session.access_token).profile
        if profile.role != "student":
            raise ApiError(403, "student_required", "Only students can open courses.")
        client.options.headers["Authorization"] = f"Bearer {session.access_token}"
        client.postgrest.auth(session.access_token)
        yield user.id, client


def _course_db_error(error: Exception) -> ApiError:
    logger.exception("Course delivery storage operation failed.")
    if getattr(error, "code", None) == "PGRST205":
        return ApiError(
            503,
            "courses_not_configured",
            "Course delivery storage is not configured. Apply "
            "supabase/migrations/20261028000000_course_delivery.sql "
            "to your Supabase project, then try again.",
        )
    return ApiError(503, "courses_unavailable", "Unable to load course content. Try again later.")


def _published_material(db: Client, material_id: str) -> dict[str, Any]:
    # 404 (never 403) so unpublished or missing materials are not enumerable.
    try:
        response = db.table("materials").select("id,title,type,data,published_at").eq(
            "id", material_id
        ).eq("published", True).maybe_single().execute()
    except Exception as error:
        raise _course_db_error(error) from None
    if not response or not response.data:
        raise ApiError(404, "course_not_found", "This course is not available.")
    return response.data


@router.get("", response_model=list[CourseSummary])
def list_courses(
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
):
    for _user_id, db in _require_student(request, client, store):
        try:
            rows = db.table("materials").select("id,title,type,published_at").eq(
                "published", True
            ).order("published_at", desc=True).limit(50).execute().data or []
        except Exception as error:
            raise _course_db_error(error) from None
        return [
            CourseSummary(
                id=str(row["id"]),
                title=row["title"],
                type=row["type"],
                publishedAt=row.get("published_at"),
            )
            for row in rows
        ]


def _project_content(data: dict[str, Any]) -> dict[str, Any]:
    """Strips answer keys and editor-only fields from the stored material."""
    if data.get("type") == "quiz":
        questions = []
        for question in data.get("questions") or []:
            if not isinstance(question, dict) or not question.get("id"):
                continue
            options = [str(option) for option in question.get("options") or []]
            questions.append({
                "id": question["id"],
                "question": question.get("question") or "",
                "options": options,
            })
        return {"type": "quiz", "questions": questions}

    slides = []
    for slide in data.get("content") or []:
        if not isinstance(slide, dict):
            continue
        slides.append({
            "title": slide.get("title") or "",
            "bullets": [str(bullet) for bullet in slide.get("bullets") or []],
            "visual": slide.get("visual") or {"kind": "diagram", "description": "", "steps": []},
            "theme": slide.get("theme"),
            "imageData": slide.get("imageData"),
        })
    return {"type": "slides", "content": slides}


@router.get("/{material_id}")
def get_course(
    material_id: UUID,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
):
    for _user_id, db in _require_student(request, client, store):
        row = _published_material(db, str(material_id))
        return {
            "id": str(row["id"]),
            "title": row["title"],
            "publishedAt": row.get("published_at"),
            "content": _project_content(row.get("data") or {}),
        }


@router.post("/{material_id}/answers")
def answer_question(
    material_id: UUID,
    payload: CourseAnswerIn,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
):
    for user_id, db in _require_student(request, client, store):
        row = _published_material(db, str(material_id))
        data = row.get("data") or {}
        question = next(
            (
                item
                for item in data.get("questions") or []
                if isinstance(item, dict) and item.get("id") == payload.question_id
            ),
            None,
        )
        correct_index = question.get("correctAnswerIndex") if question else None
        if not isinstance(correct_index, int):
            raise ApiError(404, "question_not_found", "This course question was not found.")
        is_correct = payload.selected_index == correct_index
        try:
            db.table("course_quiz_answers").insert({
                "user_id": user_id,
                "material_id": str(material_id),
                "question_id": payload.question_id,
                "selected_index": payload.selected_index,
                "correct": is_correct,
            }).execute()
        except Exception:
            raise ApiError(503, "answer_save_failed", "Unable to save your answer. Try again.") from None
        return {
            "correct": is_correct,
            "correct_index": correct_index,
            "explanation": question.get("explanation"),
        }


@router.post("/{material_id}/progress", status_code=204)
def report_progress(
    material_id: UUID,
    payload: CourseProgressIn,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
) -> None:
    for user_id, db in _require_student(request, client, store):
        _published_material(db, str(material_id))
        now = datetime.now(UTC).isoformat()
        try:
            if payload.event == "start":
                db.table("course_progress").upsert(
                    {
                        "user_id": user_id,
                        "material_id": str(material_id),
                        "started_at": now,
                        "last_active_at": now,
                    },
                    on_conflict="user_id,material_id",
                    ignore_duplicates=True,
                ).execute()
            else:
                db.table("course_progress").upsert(
                    {
                        "user_id": user_id,
                        "material_id": str(material_id),
                        "completed_at": now,
                        "last_active_at": now,
                    },
                    on_conflict="user_id,material_id",
                ).execute()
        except Exception:
            raise ApiError(503, "progress_save_failed", "Unable to save your progress. Try again later.") from None
        return None
