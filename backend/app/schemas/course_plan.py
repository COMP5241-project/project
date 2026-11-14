from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

PresentationFormat = Literal[
    "text-and-images",
    "interactive-simulations",
    "interactive-role-play-activities",
    "games",
    "animations",
    "slides-based",
    "online-coding",
]
CourseVisibility = Literal["public", "restricted"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


NonEmptyText = Annotated[str, Field(min_length=1, max_length=4000)]
Identifier = Annotated[
    str,
    Field(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]*$"),
]


class SuggestedActivity(StrictModel):
    title: Annotated[str, Field(min_length=1, max_length=200)]
    description: NonEmptyText
    presentation_format: PresentationFormat


class LessonPlan(StrictModel):
    lesson_id: Identifier
    title: Annotated[str, Field(min_length=1, max_length=200)]
    purpose: NonEmptyText
    objectives: Annotated[list[NonEmptyText], Field(min_length=2, max_length=3)]
    key_topics: Annotated[list[NonEmptyText], Field(min_length=1)]
    suggested_activity: SuggestedActivity
    completion_check: NonEmptyText
    prerequisite_lesson_ids: list[Identifier] = Field(default_factory=list)
    estimated_minutes: Annotated[int, Field(gt=0, le=1440)] | None = None


class ModulePlan(StrictModel):
    module_id: Identifier
    title: Annotated[str, Field(min_length=1, max_length=200)]
    description: NonEmptyText
    lessons: Annotated[list[LessonPlan], Field(min_length=1)]


class CoursePlan(StrictModel):
    overview: NonEmptyText
    target_audience: NonEmptyText
    assumptions: list[NonEmptyText] = Field(default_factory=list)
    learning_outcomes: Annotated[list[NonEmptyText], Field(min_length=1)]
    prerequisites: list[NonEmptyText] = Field(default_factory=list)
    modules: Annotated[list[ModulePlan], Field(min_length=1)]
    milestones: list[NonEmptyText] = Field(default_factory=list)
    capstone: NonEmptyText

    @model_validator(mode="after")
    def validate_lesson_references(self) -> "CoursePlan":
        lesson_positions: dict[str, int] = {}
        position = 0

        for module in self.modules:
            for lesson in module.lessons:
                if lesson.lesson_id in lesson_positions:
                    raise ValueError(f"duplicate lesson_id: {lesson.lesson_id}")
                lesson_positions[lesson.lesson_id] = position
                position += 1

        for lesson in (lesson for module in self.modules for lesson in module.lessons):
            if len(set(lesson.prerequisite_lesson_ids)) != len(
                lesson.prerequisite_lesson_ids
            ):
                raise ValueError(
                    f"duplicate prerequisite for lesson {lesson.lesson_id}"
                )
            for prerequisite_id in lesson.prerequisite_lesson_ids:
                prerequisite_position = lesson_positions.get(prerequisite_id)
                if prerequisite_position is None:
                    raise ValueError(
                        f"unknown prerequisite lesson_id: {prerequisite_id}"
                    )
                if prerequisite_position >= lesson_positions[lesson.lesson_id]:
                    raise ValueError(
                        f"prerequisite {prerequisite_id} must appear before "
                        f"lesson {lesson.lesson_id}"
                    )
        return self


class CourseDraftRequest(StrictModel):
    topic: Annotated[str, Field(min_length=3, max_length=200)]
    learning_goal: Annotated[str, Field(max_length=1000)] | None = None
    target_audience: Annotated[str, Field(max_length=500)] | None = None
    experience_level: Annotated[str, Field(max_length=100)] | None = None
    time_budget_minutes: Annotated[int, Field(gt=0, le=10080)] | None = None
    constraints: Annotated[
        list[Annotated[str, Field(min_length=1, max_length=500)]], Field(max_length=20)
    ] = Field(default_factory=list)
    preferred_formats: list[PresentationFormat] = Field(default_factory=list)


class CourseDraftProposal(StrictModel):
    title: Annotated[str, Field(min_length=1, max_length=200)]
    description: NonEmptyText
    default_presentation_format: PresentationFormat = "text-and-images"
    visibility: CourseVisibility = "restricted"
    plan: CoursePlan


class CourseSaveResponse(StrictModel):
    course_id: str
    version_id: str
    version_number: int
    status: Literal["draft"]
    visibility: CourseVisibility


class CoursePublishResponse(StrictModel):
    course_id: str
    status: Literal["published"]
    published_at: str
