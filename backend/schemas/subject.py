from typing import Any, Optional

from pydantic import BaseModel


class SubjectOption(BaseModel):
    code: str
    description: str


class SubjectsResponse(BaseModel):
    data: list[SubjectOption]
    source: str
    cached_at: int | None = None

