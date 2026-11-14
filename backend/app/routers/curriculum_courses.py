import logging
from collections.abc import Generator
from contextlib import contextmanager
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field
from supabase import Client

from app.identity.auth import OptionalClientDependency
from app.identity.errors import ApiError
from app.identity.profiles import load_profile
from app.identity.sessions import SessionStore, StoreDependency, verified_session
from app.schemas.course_plan import CoursePlan, PresentationFormat

router = APIRouter(prefix="/api/curriculum-courses")
logger = logging.getLogger(__name__)


class PublicCurriculumCourseSummary(BaseModel):
    id: str
    title: str
    description: str
    published_at: str | None = Field(alias="publishedAt")

    model_config = ConfigDict(populate_by_name=True)


class PublicCurriculumCourse(PublicCurriculumCourseSummary):
    default_presentation_format: PresentationFormat
    plan: CoursePlan


@contextmanager
def _student_database(
    request: Request,
    client: Client | None,
    store: SessionStore,
) -> Generator[tuple[str, Client], None, None]:
    with verified_session(request, client, store) as (session, user):
        assert client is not None
        profile = load_profile(client, user.id, user.email, session.access_token).profile
        if profile.role != "student":
            raise ApiError(403, "student_required", "Only students can open courses.")
        client.options.headers["Authorization"] = f"Bearer {session.access_token}"
        client.postgrest.auth(session.access_token)
        yield user.id, client


def _database_error(error: Exception) -> ApiError:
    logger.exception("Curriculum course delivery storage operation failed.")
    if getattr(error, "code", None) in {"PGRST202", "PGRST204", "PGRST205"}:
        return ApiError(
            503,
            "curriculum_courses_not_configured",
            "Curriculum course delivery is not configured. Apply "
            "supabase/migrations/20261114000000_create_instructor_curriculum_courses.sql "
            "and supabase/migrations/20261114010000_expose_public_curricula_to_students.sql "
            "and supabase/migrations/20261114020000_manage_instructor_course_access.sql "
            "to your Supabase project, then try again.",
        )
    return ApiError(
        503,
        "curriculum_courses_unavailable",
        "Unable to load this course. Try again later.",
    )


def _rows(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, dict):
        return [data]
    if isinstance(data, list):
        return data
    return []


def _available_course_row(database: Client, course_id: UUID) -> dict[str, Any]:
    try:
        response = (
            database.table("instructor_courses")
            .select(
                "id, title, description, default_presentation_format, "
                "published_at, published_version_id"
            )
            .eq("id", str(course_id))
            .eq("status", "published")
            .maybe_single()
            .execute()
        )
    except Exception as error:
        raise _database_error(error) from None
    course = response.data if response else None
    if not course:
        raise ApiError(404, "course_not_found", "This course is not available.")
    return course


def _course_version(database: Client, version_id: str | None) -> dict[str, Any]:
    if not version_id:
        logger.error("Published instructor course references no published version.")
        raise ApiError(
            500,
            "invalid_course_version",
            "The course plan is unavailable.",
        )
    try:
        response = (
            database.table("instructor_course_versions")
            .select("id, plan")
            .eq("id", version_id)
            .maybe_single()
            .execute()
        )
    except Exception as error:
        raise _database_error(error) from None
    version = response.data if response else None
    if not version or not isinstance(version.get("plan"), dict):
        logger.error("Published instructor course references an invalid plan version.")
        raise ApiError(
            500,
            "invalid_course_version",
            "The course plan is unavailable.",
        )
    return version


@router.get("", response_model=list[PublicCurriculumCourseSummary])
def list_public_curriculum_courses(
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
) -> list[PublicCurriculumCourseSummary]:
    with _student_database(request, client, store) as (_user_id, database):
        try:
            response = (
                database.table("instructor_courses")
                .select("id, title, description, published_at")
                .eq("status", "published")
                .order("published_at", desc=True)
                .limit(100)
                .execute()
            )
        except Exception as error:
            raise _database_error(error) from None
        return [
            PublicCurriculumCourseSummary(
                id=str(course["id"]),
                title=course["title"],
                description=course["description"],
                publishedAt=course.get("published_at"),
            )
            for course in _rows(response.data if response else None)
        ]


@router.get("/{course_id}", response_model=PublicCurriculumCourse)
def get_public_curriculum_course(
    course_id: UUID,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
) -> PublicCurriculumCourse:
    with _student_database(request, client, store) as (_user_id, database):
        course = _available_course_row(database, course_id)
        version = _course_version(database, course.get("published_version_id"))
        try:
            return PublicCurriculumCourse(
                id=str(course["id"]),
                title=course["title"],
                description=course["description"],
                publishedAt=course.get("published_at"),
                default_presentation_format=course["default_presentation_format"],
                plan=version["plan"],
            )
        except (KeyError, TypeError, ValueError) as error:
            logger.exception("Published instructor course returned an invalid record.")
            raise ApiError(
                500,
                "invalid_course_version",
                "The course plan is unavailable.",
            ) from error
