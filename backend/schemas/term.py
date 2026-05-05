from typing import Optional

from pydantic import BaseModel


class TermsResponse(BaseModel):
    data: dict[str, str]
    source: str
    cached_at: int | None = None

