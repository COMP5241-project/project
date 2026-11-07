from datetime import datetime, timezone
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.database.supabase import get_supabase_client
from app.routes.learning_sessions import get_current_user_id

router = APIRouter(prefix="/api/v1/courses", tags=["courses"])


class CourseResponse(BaseModel):
    id: UUID
    title: str


class CreatedCourseResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    status: Literal["draft", "published"]
    created_at: str
    updated_at: str


@router.get("", response_model=list[CourseResponse])
def list_published_courses(
    supabase_client: Annotated[Client, Depends(get_supabase_client)],
) -> list[CourseResponse]:
    response = (
        supabase_client.table("courses")
        .select("id,title")
        .eq("status", "published")
        .order("title")
        .execute()
    )
    return [CourseResponse.model_validate(course) for course in response.data]


@router.get("/mine", response_model=list[CreatedCourseResponse])
def list_my_courses(
    user_id: Annotated[int, Depends(get_current_user_id)],
    supabase_client: Annotated[Client, Depends(get_supabase_client)],
) -> list[CreatedCourseResponse]:
    response = (
        supabase_client.table("courses")
        .select("id,title,description,status,created_at,updated_at")
        .eq("created_by", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [
        CreatedCourseResponse.model_validate(course) for course in response.data
    ]


@router.patch("/{course_id}/status", response_model=CreatedCourseResponse)
def toggle_course_status(
    course_id: UUID,
    user_id: Annotated[int, Depends(get_current_user_id)],
    supabase_client: Annotated[Client, Depends(get_supabase_client)],
) -> CreatedCourseResponse:
    current_response = (
        supabase_client.table("courses")
        .select("status")
        .eq("id", str(course_id))
        .eq("created_by", user_id)
        .limit(1)
        .execute()
    )
    if not current_response.data:
        raise HTTPException(status_code=404, detail="Course not found.")

    current_status = current_response.data[0]["status"]
    if current_status not in ("draft", "published"):
        raise HTTPException(
            status_code=409, detail="Course status cannot be changed."
        )
    new_status = "published" if current_status == "draft" else "draft"

    response = (
        supabase_client.table("courses")
        .update(
            {
                "status": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", str(course_id))
        .eq("created_by", user_id)
        .eq("status", current_status)
        .select("id,title,description,status,created_at,updated_at")
        .execute()
    )
    if not response.data:
        raise HTTPException(
            status_code=409,
            detail="Course status changed before the update completed. Refresh and try again.",
        )
    return CreatedCourseResponse.model_validate(response.data[0])
