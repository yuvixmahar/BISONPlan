import httpx
from fastapi import HTTPException


def aurora_unavailable_error(action: str, error: Exception) -> HTTPException:
    return HTTPException(
        status_code=503,
        detail=f"Aurora is unreachable (error while {action}): {type(error).__name__}",
    )


AURORA_ERRORS = (httpx.HTTPStatusError, httpx.RequestError)
