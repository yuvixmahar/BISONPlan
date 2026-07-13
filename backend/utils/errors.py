from collections.abc import Iterator
from contextlib import contextmanager

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


@contextmanager
def aurora_error_handling(action: str) -> Iterator[None]:
    """Map Aurora failures to HTTP errors for a route body.

    ``action`` names the operation (e.g. "scraping") for the 503 detail.
    """
    try:
        yield
    except AuroraBudgetBlocked as e:
        raise aurora_budget_error(e)
    except AURORA_ERRORS as e:
        raise aurora_unavailable_error(action, e)
