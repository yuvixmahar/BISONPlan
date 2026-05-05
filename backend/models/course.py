from __future__ import annotations

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class CourseCatalog(Base):
    """
    Static course catalog data (descriptions / prerequisites).

    Note: Aurora seat availability must remain live; this model is intended
    only for slower-changing catalog metadata.
    """

    __tablename__ = "course_catalog"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    course_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    prerequisites_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    corequisites_raw: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="CURRENT_TIMESTAMP"
    )

