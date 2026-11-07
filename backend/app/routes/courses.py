from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from supabase import Client

from app.database.supabase import get_supabase_client

router = APIRouter(prefix="/api/v1/courses", tags=["courses"])


class CourseResponse(BaseModel):
    id: UUID
    title: str


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
