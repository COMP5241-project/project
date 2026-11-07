from datetime import datetime, timezone
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
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


class CourseDetailResponse(CreatedCourseResponse):
    learning_prompt: str


class CourseUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(max_length=2000)
    learning_prompt: str = Field(min_length=1, max_length=50000)

    @model_validator(mode="after")
    def content_must_not_be_blank(self) -> "CourseUpdateRequest":
        if not self.title.strip():
            raise ValueError("The course title must not be blank.")
        if not self.learning_prompt.strip():
            raise ValueError("The learning prompt must not be blank.")
        return self


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


@router.get("/{course_id}", response_model=CourseDetailResponse)
def get_my_course(
    course_id: UUID,
    user_id: Annotated[int, Depends(get_current_user_id)],
    supabase_client: Annotated[Client, Depends(get_supabase_client)],
) -> CourseDetailResponse:
    response = (
        supabase_client.table("courses")
        .select("id,title,description,status,created_at,updated_at,content")
        .eq("id", str(course_id))
        .eq("created_by", user_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Course not found.")

    course = response.data[0]
    prompt_response = (
        supabase_client.table("course_learning_prompts")
        .select("prompt")
        .eq("course_id", str(course_id))
        .limit(1)
        .execute()
    )
    return CourseDetailResponse(
        **{
            **course,
            "learning_prompt": (
                prompt_response.data[0]["prompt"]
                if prompt_response.data
                else course["content"] or ""
            ),
        }
    )


@router.put("/{course_id}", response_model=CourseDetailResponse)
def update_my_course(
    course_id: UUID,
    request: CourseUpdateRequest,
    user_id: Annotated[int, Depends(get_current_user_id)],
    supabase_client: Annotated[Client, Depends(get_supabase_client)],
) -> CourseDetailResponse:
    response = supabase_client.rpc(
        "update_personalized_course",
        {
            "p_user_id": user_id,
            "p_course_id": str(course_id),
            "p_title": request.title.strip(),
            "p_description": request.description.strip(),
            "p_prompt": request.learning_prompt.strip(),
        },
    ).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Course not found.")
    return CourseDetailResponse.model_validate(response.data[0])


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
