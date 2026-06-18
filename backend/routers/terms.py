from fastapi import APIRouter, Query, Request

from ..limiter import limiter
from ..services.aurora import AuroraBudgetBlocked, fetch_terms, make_client
from ..services.cached_aurora import cached_aurora_fetch
from ..utils.api_response import api_response
from ..utils.aurora_data import normalize_term_items
from ..utils.errors import AURORA_ERRORS, aurora_budget_error, aurora_unavailable_error
from ..utils.pagination import paginated_page

router = APIRouter()


@router.get("/terms")
@limiter.limit("30/minute")
async def get_terms(
    request: Request,
    offset: int = Query(1, ge=1),
    max: int = Query(10, ge=1, le=50),
    searchTerm: str = Query("", alias="searchTerm", max_length=50),
):
    cache_key = f"terms:{searchTerm}:{offset}:{max}"

    async def fetcher():
        async with make_client() as client:
            return await fetch_terms(
                client,
                offset=offset,
                max_items=max,
                search_term=searchTerm,
            )

    try:
        result = await cached_aurora_fetch(cache_key, fetcher)
        payload = paginated_page(normalize_term_items(result["data"]), offset, max)
        return api_response(
            True,
            result["source"],
            result["cached_at"],
            payload,
            budget_message=result["budget_message"],
        )
    except AuroraBudgetBlocked as e:
        raise aurora_budget_error(e)
    except AURORA_ERRORS as e:
        raise aurora_unavailable_error("fetching terms", e)
