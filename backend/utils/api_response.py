from typing import Any

from pydantic import BaseModel


class ApiResponse(BaseModel):
    """Envelope for every API response.

    Optional fields serialize as ``null`` when unset; the frontend reads them
    with ``??`` so absent-vs-null makes no difference to consumers.
    """

    success: bool
    source: str
    cached_at: int | None
    data: Any
    budget_message: str | None = None
    cache_ttl_seconds: int | None = None
    total: int | None = None

    @classmethod
    def from_result(cls, result: dict[str, Any], data: Any, **extra: Any) -> "ApiResponse":
        """Build a success envelope from a ``cached_aurora_fetch`` result.

        ``data`` is passed explicitly because callers often reshape it (e.g.
        wrap it in a paginated page) before returning.
        """
        return cls(
            success=True,
            source=result["source"],
            cached_at=result["cached_at"],
            data=data,
            budget_message=result["budget_message"],
            **extra,
        )
