import httpx
from fastapi import HTTPException

from ..services.aurora import AuroraBudgetBlocked


def aurora_unavailable_error(action: str, error: Exception) -> HTTPException:
    return HTTPException(
        status_code=503,
        detail=f"Aurora is unreachable (error while {action}): {type(error).__name__}",
    )


def aurora_budget_error(error: AuroraBudgetBlocked) -> HTTPException:
    return HTTPException(status_code=503, detail=error.message)


AURORA_ERRORS = (httpx.HTTPStatusError, httpx.RequestError)
