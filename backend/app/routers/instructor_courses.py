import logging
from collections.abc import Generator
from contextlib import contextmanager
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from httpx import Client as HttpClient
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from supabase import Client

from app.course_plan_generation import (
    CoursePlanGeneratorNotConfiguredError,
    CoursePlanGeneratorUnavailableError,
    generate_course_proposal,
)
from app.identity.auth import OptionalClientDependency
from app.identity.errors import ApiError
from app.identity.profiles import load_profile
from app.identity.sessions import SessionStore, StoreDependency, verified_session
from app.routers.auth import require_trusted_origin
from app.schemas.course_plan import (
    CoursePlan,
    CourseDraftProposal,
    CourseDraftRequest,
    CoursePublishResponse,
    CourseSaveResponse,
)

router = APIRouter(prefix="/api/instructor/courses")
logger = logging.getLogger(__name__)

CourseVisibility = Literal["public", "restricted"]
CourseStatus = Literal["draft", "published", "archived"]


class InstructorCourseSummary(BaseModel):
    id: str
    title: str
    description: str
    status: CourseStatus
    visibility: CourseVisibility
    default_presentation_format: str
    published_at: str | None = Field(alias="publishedAt")
    updated_at: str = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True)


class InstructorCourseDetail(InstructorCourseSummary):
    version_number: int
    plan: CoursePlan


class CourseVisibilityUpdate(BaseModel):
    visibility: CourseVisibility


class CourseStatusUpdate(BaseModel):
    status: Literal["draft", "published"]


class CourseStatusResponse(BaseModel):
    course_id: str
    status: Literal["draft", "published"]
    published_at: str | None


class CourseVisibilityResponse(BaseModel):
    course_id: str
    visibility: CourseVisibility


class CourseAccessGrantRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

    model_config = ConfigDict(str_strip_whitespace=True)


class CourseAccessEntry(BaseModel):
    user_id: str
    email: str
    granted_at: str = Field(alias="grantedAt")

    model_config = ConfigDict(populate_by_name=True)


@contextmanager
def _instructor_database(
    request: Request,
    client: Client | None,
    store: SessionStore,
) -> Generator[tuple[str, Client], None, None]:
    with verified_session(request, client, store) as (session, user):
        assert client is not None
        profile = load_profile(client, user.id, user.email, session.access_token).profile
        if profile.role != "instructor":
            raise ApiError(
                403,
                "instructor_required",
                "Only instructors can manage courses.",
            )
        client.options.headers["Authorization"] = f"Bearer {session.access_token}"
        client.postgrest.auth(session.access_token)
        yield user.id, client


def _database_error(error: Exception) -> ApiError:
    logger.exception("Instructor course storage operation failed.")
    if getattr(error, "code", None) in {"PGRST202", "PGRST204", "PGRST205"}:
        return ApiError(
            503,
            "instructor_courses_not_configured",
            "Instructor course storage is not configured. Apply "
            "supabase/migrations/20261114000000_create_instructor_curriculum_courses.sql "
            "and supabase/migrations/20261114020000_manage_instructor_course_access.sql "
            "to your Supabase project, then try again.",
        )
    return ApiError(
        503,
        "instructor_courses_unavailable",
        "Unable to manage this course. Try again later.",
    )


def _rows(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, dict):
        return [data]
    if isinstance(data, list):
        return data
    return []


def _owned_course(database: Client, course_id: UUID, user_id: str) -> dict[str, Any]:
    try:
        response = (
            database.table("instructor_courses")
            .select("id, status, visibility, current_version_id")
            .eq("id", str(course_id))
            .eq("created_by", user_id)
            .maybe_single()
            .execute()
        )
    except Exception as error:
        raise _database_error(error) from None
    course = response.data if response else None
    if not course:
        raise ApiError(404, "course_not_found", "Course not found.")
    return course


def _owned_draft(database: Client, course_id: UUID, user_id: str) -> dict[str, Any]:
    try:
        response = (
            database.table("instructor_courses")
            .select("id, status, created_by")
            .eq("id", str(course_id))
            .eq("created_by", user_id)
            .maybe_single()
            .execute()
        )
    except Exception as error:
        raise _database_error(error) from None
    course = response.data if response else None
    if not course or course.get("status") != "draft":
        raise ApiError(404, "draft_course_not_found", "Draft course not found.")
    return course


@router.get("", response_model=list[InstructorCourseSummary])
def list_instructor_courses(
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
) -> list[InstructorCourseSummary]:
    with _instructor_database(request, client, store) as (user_id, database):
        try:
            response = (
                database.table("instructor_courses")
                .select(
                    "id, title, description, status, visibility, "
                    "default_presentation_format, published_at, updated_at"
                )
                .eq("created_by", user_id)
                .order("updated_at", desc=True)
                .limit(100)
                .execute()
            )
        except Exception as error:
            raise _database_error(error) from None
        try:
            return [
                InstructorCourseSummary(
                    id=str(course["id"]),
                    title=course["title"],
                    description=course["description"],
                    status=course["status"],
                    visibility=course["visibility"],
                    default_presentation_format=course["default_presentation_format"],
                    publishedAt=course.get("published_at"),
                    updatedAt=course["updated_at"],
                )
                for course in _rows(response.data if response else None)
            ]
        except (KeyError, TypeError, ValidationError) as error:
            logger.exception("Listing instructor courses returned an invalid record.")
            raise ApiError(
                500,
                "invalid_database_response",
                "The saved courses could not be loaded.",
            ) from error


@router.get("/{course_id}", response_model=InstructorCourseDetail)
def get_instructor_course(
    course_id: UUID,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
) -> InstructorCourseDetail:
    with _instructor_database(request, client, store) as (user_id, database):
        try:
            response = (
                database.table("instructor_courses")
                .select(
                    "id, title, description, status, visibility, "
                    "default_presentation_format, published_at, updated_at, "
                    "current_version_id"
                )
                .eq("id", str(course_id))
                .eq("created_by", user_id)
                .maybe_single()
                .execute()
            )
            course = response.data if response else None
            if not course:
                raise ApiError(404, "course_not_found", "Course not found.")
            version_id = course.get("current_version_id")
            if not version_id:
                raise ApiError(404, "course_version_not_found", "Course plan not found.")
            version_response = (
                database.table("instructor_course_versions")
                .select("version_number, plan")
                .eq("id", version_id)
                .eq("course_id", str(course_id))
                .maybe_single()
                .execute()
            )
            version = version_response.data if version_response else None
            if not version or not isinstance(version.get("plan"), dict):
                raise ApiError(404, "course_version_not_found", "Course plan not found.")
            return InstructorCourseDetail(
                id=str(course["id"]),
                title=course["title"],
                description=course["description"],
                status=course["status"],
                visibility=course["visibility"],
                default_presentation_format=course["default_presentation_format"],
                publishedAt=course.get("published_at"),
                updatedAt=course["updated_at"],
                version_number=version["version_number"],
                plan=version["plan"],
            )
        except ApiError:
            raise
        except Exception as error:
            raise _database_error(error) from None


@router.patch(
    "/{course_id}/visibility",
    response_model=CourseVisibilityResponse,
    dependencies=[Depends(require_trusted_origin)],
)
def update_course_visibility(
    course_id: UUID,
    payload: CourseVisibilityUpdate,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
) -> CourseVisibilityResponse:
    with _instructor_database(request, client, store) as (user_id, database):
        _owned_course(database, course_id, user_id)
        try:
            response = database.rpc(
                "set_instructor_course_visibility",
                {
                    "p_course_id": str(course_id),
                    "p_created_by": user_id,
                    "p_visibility": payload.visibility,
                },
            ).execute()
        except Exception as error:
            raise _database_error(error) from None
        rows = _rows(response.data if response else None)
        if not rows:
            raise ApiError(404, "course_not_found", "Course not found.")
        return CourseVisibilityResponse(
            course_id=str(rows[0]["course_id"]),
            visibility=rows[0]["visibility"],
        )


@router.patch(
    "/{course_id}/status",
    response_model=CourseStatusResponse,
    dependencies=[Depends(require_trusted_origin)],
)
def update_course_status(
    course_id: UUID,
    payload: CourseStatusUpdate,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
) -> CourseStatusResponse:
    with _instructor_database(request, client, store) as (user_id, database):
        course = _owned_course(database, course_id, user_id)
        if payload.status == "published" and not course.get("current_version_id"):
            raise ApiError(
                422,
                "course_version_required",
                "Save a course plan before publishing it.",
            )
        try:
            response = database.rpc(
                "set_instructor_course_status",
                {
                    "p_course_id": str(course_id),
                    "p_created_by": user_id,
                    "p_status": payload.status,
                },
            ).execute()
        except Exception as error:
            raise _database_error(error) from None
        rows = _rows(response.data if response else None)
        if not rows:
            raise ApiError(404, "course_not_found", "Course not found.")
        return CourseStatusResponse(
            course_id=str(rows[0]["course_id"]),
            status=rows[0]["status"],
            published_at=rows[0].get("published_at"),
        )


@router.get("/{course_id}/access", response_model=list[CourseAccessEntry])
def list_course_access(
    course_id: UUID,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
) -> list[CourseAccessEntry]:
    with _instructor_database(request, client, store) as (user_id, database):
        _owned_course(database, course_id, user_id)
        try:
            response = database.rpc(
                "list_instructor_course_access",
                {"p_course_id": str(course_id), "p_created_by": user_id},
            ).execute()
        except Exception as error:
            raise _database_error(error) from None
        return [
            CourseAccessEntry(
                user_id=str(row["user_id"]),
                email=row["email"],
                grantedAt=row["granted_at"],
            )
            for row in _rows(response.data if response else None)
        ]


@router.post(
    "/{course_id}/access",
    response_model=CourseAccessEntry,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_trusted_origin)],
)
def grant_course_access(
    course_id: UUID,
    payload: CourseAccessGrantRequest,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
) -> CourseAccessEntry:
    with _instructor_database(request, client, store) as (user_id, database):
        course = _owned_course(database, course_id, user_id)
        if course["status"] != "published" or course["visibility"] != "restricted":
            raise ApiError(
                409,
                "course_not_restricted_published",
                "Publish the course as restricted before granting student access.",
            )
        try:
            response = database.rpc(
                "grant_instructor_course_access",
                {
                    "p_course_id": str(course_id),
                    "p_created_by": user_id,
                    "p_email": payload.email.strip(),
                },
            ).execute()
        except Exception as error:
            if getattr(error, "code", None) == "P0002":
                raise ApiError(
                    404,
                    "student_not_found",
                    "No student account was found with that email address.",
                ) from None
            raise _database_error(error) from None
        rows = _rows(response.data if response else None)
        if not rows:
            raise ApiError(500, "invalid_database_response", "Student access could not be granted.")
        return CourseAccessEntry(
            user_id=str(rows[0]["user_id"]),
            email=rows[0]["email"],
            grantedAt=rows[0]["granted_at"],
        )


@router.delete(
    "/{course_id}/access/{learner_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_trusted_origin)],
)
def revoke_course_access(
    course_id: UUID,
    learner_id: UUID,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
) -> None:
    with _instructor_database(request, client, store) as (user_id, database):
        _owned_course(database, course_id, user_id)
        try:
            database.rpc(
                "revoke_instructor_course_access",
                {
                    "p_course_id": str(course_id),
                    "p_created_by": user_id,
                    "p_user_id": str(learner_id),
                },
            ).execute()
        except Exception as error:
            if getattr(error, "code", None) == "P0002":
                raise ApiError(
                    404,
                    "course_access_not_found",
                    "Student access grant not found.",
                ) from None
            raise _database_error(error) from None
        return None


@router.post(
    "/generate",
    response_model=CourseDraftProposal,
    dependencies=[Depends(require_trusted_origin)],
)
def generate_course_plan(
    payload: CourseDraftRequest,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
) -> CourseDraftProposal:
    with _instructor_database(request, client, store):
        try:
            with HttpClient(timeout=60) as http_client:
                return generate_course_proposal(payload, http_client)
        except CoursePlanGeneratorNotConfiguredError:
            raise ApiError(
                503,
                "course_generator_unavailable",
                "The AI course generator is not configured. Ask your administrator to enable it.",
            ) from None
        except CoursePlanGeneratorUnavailableError:
            raise ApiError(
                502,
                "course_generator_unavailable",
                "The AI course generator is unavailable or returned an invalid course plan. Please try again.",
            ) from None
        except Exception as error:
            logger.exception("Course plan generation request failed.")
            raise ApiError(
                502,
                "course_generation_failed",
                "Course generation failed. Please try again.",
            ) from error


def _save_course(
    database: Client,
    user_id: str,
    proposal: CourseDraftProposal,
    course_id: UUID | None = None,
) -> CourseSaveResponse:
    try:
        response = database.rpc(
            "save_instructor_course_draft",
            {
                "p_created_by": user_id,
                "p_title": proposal.title,
                "p_description": proposal.description,
                "p_default_presentation_format": proposal.default_presentation_format,
                "p_visibility": proposal.visibility,
                "p_plan": proposal.plan.model_dump(mode="json"),
                "p_course_id": str(course_id) if course_id else None,
            },
        ).execute()
    except Exception as error:
        raise _database_error(error) from None
    rows = _rows(response.data if response else None)
    if not rows:
        logger.error("Saving instructor course draft returned no version record.")
        raise ApiError(
            500,
            "invalid_database_response",
            "The course could not be saved.",
        )
    record = rows[0]
    try:
        return CourseSaveResponse(
            course_id=str(record["course_id"]),
            version_id=str(record["version_id"]),
            version_number=record["version_number"],
            status="draft",
            visibility=proposal.visibility,
        )
    except (KeyError, TypeError, ValidationError) as error:
        logger.exception("Saving an instructor course draft returned an invalid record.")
        raise ApiError(
            500,
            "invalid_database_response",
            "The course could not be saved.",
        ) from error


@router.post(
    "",
    response_model=CourseSaveResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_trusted_origin)],
)
def save_course_draft(
    proposal: CourseDraftProposal,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
) -> CourseSaveResponse:
    with _instructor_database(request, client, store) as (user_id, database):
        return _save_course(database, user_id, proposal)


@router.patch(
    "/{course_id}",
    response_model=CourseSaveResponse,
    dependencies=[Depends(require_trusted_origin)],
)
def update_course_draft(
    course_id: UUID,
    proposal: CourseDraftProposal,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
) -> CourseSaveResponse:
    with _instructor_database(request, client, store) as (user_id, database):
        _owned_draft(database, course_id, user_id)
        return _save_course(database, user_id, proposal, course_id)


@router.post(
    "/{course_id}/publish",
    response_model=CoursePublishResponse,
    dependencies=[Depends(require_trusted_origin)],
)
def publish_course_draft(
    course_id: UUID,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
) -> CoursePublishResponse:
    with _instructor_database(request, client, store) as (user_id, database):
        _owned_draft(database, course_id, user_id)
        try:
            response = database.rpc(
                "publish_instructor_course",
                {"p_course_id": str(course_id), "p_created_by": user_id},
            ).execute()
        except Exception as error:
            raise _database_error(error) from None
        rows = _rows(response.data if response else None)
        if not rows:
            raise ApiError(404, "draft_course_not_found", "Draft course not found.")
        try:
            return CoursePublishResponse(
                course_id=str(rows[0]["course_id"]),
                status="published",
                published_at=rows[0]["published_at"],
            )
        except (KeyError, TypeError, ValidationError) as error:
            logger.exception("Publishing an instructor course returned an invalid record.")
            raise ApiError(
                500,
                "invalid_database_response",
                "The course could not be published.",
            ) from error
