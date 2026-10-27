"""Roster import & participation analytics.

Instructors import a CSV roster (``name,email``), re-importing refreshes it.
Matching roster emails are linked to signed-up accounts so course progress
and quiz answers can be aggregated per roster for the analytics view.
"""

import csv
import io
import re
import uuid
from collections.abc import Generator
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Form, Request, UploadFile
from pydantic import BaseModel, ConfigDict, Field
from supabase import Client

from app.identity.auth import OptionalClientDependency
from app.identity.errors import ApiError
from app.identity.sessions import StoreDependency
from app.routers.auth import require_trusted_origin
from app.routers.materials import _authorize_instructor

router = APIRouter(prefix="/api/rosters")
MAX_ROSTER_BYTES = 2 * 1024 * 1024
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ACTIVE_WINDOW_DAYS = 30


class RosterOut(BaseModel):
    id: str
    name: str
    created_at: str = Field(alias="createdAt")
    student_count: int = Field(alias="studentCount")

    model_config = ConfigDict(populate_by_name=True)


class RosterStudentOut(BaseModel):
    id: str
    name: str
    email: str
    matched: bool
    imported_at: str = Field(alias="importedAt")
    last_active_at: str | None = Field(default=None, alias="lastActiveAt")
    courses_completed: int = Field(default=0, alias="coursesCompleted")
    quiz_average: float | None = Field(default=None, alias="quizAverage")

    model_config = ConfigDict(populate_by_name=True)


class CourseAnalyticsOut(BaseModel):
    course_id: str = Field(alias="courseId")
    title: str
    started: int
    completed: int
    quiz_average: float | None = Field(default=None, alias="quizAverage")

    model_config = ConfigDict(populate_by_name=True)


class RosterAnalyticsOut(BaseModel):
    enrolled: int
    matched: int
    active: int
    participation_rate: float = Field(alias="participationRate")
    quiz_average: float | None = Field(default=None, alias="quizAverage")
    courses: list[CourseAnalyticsOut]

    model_config = ConfigDict(populate_by_name=True)


def _parse_roster_csv(text: str) -> list[dict[str, str]]:
    """Parses a ``name,email`` roster CSV into ``[{email, name}]`` rows."""
    reader = csv.DictReader(io.StringIO(text))
    column_map: dict[str, str] = {}
    for field in reader.fieldnames or []:
        if field is None:
            continue
        key = field.strip().lower()
        if key in {"name", "email"}:
            column_map[key] = field
    if "email" not in column_map:
        raise ApiError(422, "roster_csv_invalid", "The roster CSV needs a header row with 'name' and 'email' columns.")
    rows: list[dict[str, str]] = []
    seen: set[str] = set()
    for row in reader:
        email = (row.get(column_map["email"]) or "").strip()
        name = (row.get(column_map["name"]) or "").strip() if "name" in column_map else ""
        if not email and not name:
            continue
        if not EMAIL_RE.match(email):
            raise ApiError(422, "roster_csv_invalid", "The roster CSV contains an invalid email address.")
        email = email.lower()
        if email in seen:
            continue
        seen.add(email)
        rows.append({"email": email, "name": name or email.split("@", 1)[0]})
    if not rows:
        raise ApiError(422, "roster_csv_empty", "The roster CSV contains no students.")
    return rows


@router.post("/import", dependencies=[Depends(require_trusted_origin)])
def import_roster(
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
    file: UploadFile,
    name: str | None = Form(default=None),
):
    for user_id, db in _authorize_instructor(request, client, store):
        raw = file.file.read(MAX_ROSTER_BYTES + 1)
        if len(raw) > MAX_ROSTER_BYTES:
            raise ApiError(413, "roster_too_large", "The roster CSV must be 2 MB or smaller.")
        suffix = (file.filename or "").rsplit(".", 1)[-1].lower()
        if suffix not in {"csv", "txt"} and (file.content_type or "") not in {"text/csv", "text/plain"}:
            raise ApiError(415, "unsupported_roster_file", "Upload a CSV roster file.")
        try:
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise ApiError(422, "roster_csv_invalid", "The roster file is not readable text.") from None
        rows = _parse_roster_csv(text)

        roster_name = (name or "").strip() or (file.filename or "Imported roster").rsplit(".", 1)[0] or "Imported roster"
        try:
            roster = db.table("rosters").insert({
                "instructor_id": user_id,
                "name": roster_name[:200],
            }).execute().data[0]
            roster_id = str(roster["id"])
            matched_accounts: dict[str, str] = {}
            emails = [row["email"] for row in rows]
            if emails:
                profiles = db.table("profiles").select("id,email").in_(
                    "email", emails
                ).limit(1000).execute().data or []
                for profile in profiles:
                    email = profile.get("email")
                    if email:
                        matched_accounts[str(email).lower()] = str(profile["id"])
            values = [
                {
                    "roster_id": roster_id,
                    "user_id": matched_accounts.get(row["email"]),
                    "email": row["email"],
                    "name": row["name"][:300],
                }
                for row in rows
            ]
            for offset in range(0, len(values), 50):
                db.table("roster_students").upsert(
                    values[offset : offset + 50],
                    on_conflict="roster_id,lower(email)",
                ).execute()
        except ApiError:
            raise
        except Exception as error:
            raise ApiError(503, "roster_import_failed", "Unable to import this roster. Try again.") from None
        return {
            "roster": {
                "id": roster_id,
                "name": roster_name[:200],
                "createdAt": roster.get("created_at"),
            },
            "imported": len(rows),
            "matched": sum(1 for row in rows if row["email"] in matched_accounts),
        }


def _owned_roster(db: Client, roster_id: str, user_id: str) -> dict[str, Any]:
    try:
        response = db.table("rosters").select("*").eq("id", roster_id).eq(
            "instructor_id", user_id
        ).maybe_single().execute()
    except Exception as error:
        raise ApiError(503, "rosters_unavailable", "Unable to load rosters. Try again later.") from None
    if not response or not response.data:
        raise ApiError(404, "roster_not_found", "This roster was not found.")
    return response.data


def _average_pct(values: list[bool]) -> float | None:
    if not values:
        return None
    return round(100.0 * sum(1 for value in values if value) / len(values), 1)


@router.get("", response_model=list[RosterOut])
def list_rosters(
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
):
    for user_id, db in _authorize_instructor(request, client, store):
        try:
            rosters = db.table("rosters").select("*").eq(
                "instructor_id", user_id
            ).order("created_at", desc=True).execute().data or []
            roster_ids = [str(roster["id"]) for roster in rosters]
            counts: dict[str, int] = {}
            if roster_ids:
                students = db.table("roster_students").select("id,roster_id").in_(
                    "roster_id", roster_ids
                ).execute().data or []
                for student in students:
                    key = str(student["roster_id"])
                    counts[key] = counts.get(key, 0) + 1
            return [
                RosterOut(
                    id=str(roster["id"]),
                    name=roster["name"],
                    createdAt=roster["created_at"],
                    studentCount=counts.get(str(roster["id"]), 0),
                )
                for roster in rosters
            ]
        except ApiError:
            raise
        except Exception as error:
            raise ApiError(503, "rosters_unavailable", "Unable to load rosters. Try again later.") from None


@router.get("/{roster_id}")
def get_roster(
    roster_id: uuid.UUID,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
):
    for user_id, db in _authorize_instructor(request, client, store):
        roster = _owned_roster(db, str(roster_id), user_id)
        try:
            students = db.table("roster_students").select("*").eq(
                "roster_id", str(roster_id)
            ).order("name").execute().data or []
        except Exception as error:
            raise ApiError(503, "roster_unavailable", "Unable to load this roster. Try again later.") from None

        matched_ids = [str(student["user_id"]) for student in students if student.get("user_id")]
        progress_by_user: dict[str, list[dict[str, Any]]] = {}
        answers_by_user: dict[str, list[dict[str, Any]]] = {}
        progress_by_course: dict[str, list[dict[str, Any]]] = {}
        answers_by_course: dict[str, list[dict[str, Any]]] = {}
        course_ids: set[str] = set()
        if matched_ids:
            try:
                for row in (
                    db.table("course_progress")
                    .select("user_id,material_id,started_at,last_active_at,completed_at")
                    .in_("user_id", matched_ids)
                    .execute()
                    .data
                    or []
                ):
                    progress_by_user.setdefault(str(row["user_id"]), []).append(row)
                    course_id = str(row["material_id"])
                    progress_by_course.setdefault(course_id, []).append(row)
                    course_ids.add(course_id)
                for row in (
                    db.table("course_quiz_answers")
                    .select("user_id,material_id,correct")
                    .in_("user_id", matched_ids)
                    .execute()
                    .data
                    or []
                ):
                    answers_by_user.setdefault(str(row["user_id"]), []).append(row)
                    course_id = str(row["material_id"])
                    answers_by_course.setdefault(course_id, []).append(row)
                    course_ids.add(course_id)
            except Exception as error:
                raise ApiError(503, "roster_analytics_unavailable", "Unable to load participation data. Try again later.") from None

        # Course titles are best-effort: a course may be deleted or owned by
        # another instructor (published content only).
        titles: dict[str, str] = {}
        if course_ids:
            try:
                for row in (
                    db.table("materials")
                    .select("id,title")
                    .in_("id", sorted(course_ids))
                    .limit(100)
                    .execute()
                    .data
                    or []
                ):
                    titles[str(row["id"])] = row["title"]
            except Exception:
                pass

        cutoff = (datetime.now(UTC) - timedelta(days=ACTIVE_WINDOW_DAYS)).isoformat()
        student_out = []
        for student in students:
            uid = student.get("user_id")
            rows = progress_by_user.get(str(uid), []) if uid else []
            answer_rows = answers_by_user.get(str(uid), []) if uid else []
            last_active = max((row["last_active_at"] for row in rows), default=None)
            student_out.append(RosterStudentOut(
                id=str(student["id"]),
                name=student["name"],
                email=student["email"],
                matched=bool(uid),
                importedAt=student["imported_at"],
                lastActiveAt=last_active,
                coursesCompleted=sum(1 for row in rows if row.get("completed_at")),
                quizAverage=_average_pct([bool(row["correct"]) for row in answer_rows]),
            ))
        active_count = sum(
            1 for student in student_out
            if student.matched and student.last_active_at and student.last_active_at >= cutoff
        )
        participating = sum(1 for student in student_out if student.matched and student.last_active_at is not None)
        courses_out = [
            CourseAnalyticsOut(
                courseId=course_id,
                title=titles.get(course_id, course_id[:8]),
                started=len({str(row["user_id"]) for row in progress_by_course[course_id]}),
                completed=len({str(row["user_id"]) for row in progress_by_course[course_id] if row.get("completed_at")}),
                quizAverage=_average_pct([bool(row["correct"]) for row in answers_by_course.get(course_id, [])]),
            )
            for course_id in sorted(course_ids)
        ]
        analytics = RosterAnalyticsOut(
            enrolled=len(student_out),
            matched=len(matched_ids),
            active=active_count,
            participationRate=round(participating / len(matched_ids), 3) if matched_ids else 0.0,
            quizAverage=_average_pct([bool(row["correct"]) for rows in answers_by_user.values() for row in rows]),
            courses=courses_out,
        )
        return {
            "roster": {
                "id": str(roster["id"]),
                "name": roster["name"],
                "createdAt": roster["created_at"],
            },
            "students": student_out,
            "analytics": analytics,
        }


@router.delete("/{roster_id}", status_code=204, dependencies=[Depends(require_trusted_origin)])
def delete_roster(
    roster_id: uuid.UUID,
    request: Request,
    client: OptionalClientDependency,
    store: StoreDependency,
) -> None:
    for user_id, db in _authorize_instructor(request, client, store):
        _owned_roster(db, str(roster_id), user_id)
        try:
            db.table("rosters").delete().eq("id", str(roster_id)).eq("instructor_id", user_id).execute()
        except Exception as error:
            raise ApiError(503, "roster_delete_failed", "Unable to delete this roster. Try again.") from None
        return None
