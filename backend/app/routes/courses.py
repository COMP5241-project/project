from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
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
    status: str
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
