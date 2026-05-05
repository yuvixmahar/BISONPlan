from typing import Any, Optional

from pydantic import BaseModel


class CourseDescriptionResponse(BaseModel):
    description: str | None = None
    prerequisites_raw: str | None = None
    corequisites_raw: str | None = None
    prerequisites: list[str] = []
    corequisites: list[str] = []
    note: Optional[str] = None

    class Config:
        extra = "allow"


class CoursesListResponse(BaseModel):
    # We keep these flexible: Aurora's payload is not stable.
    data: list[dict[str, Any]]
    source: str
    cached_at: int | None

