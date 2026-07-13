from fastapi import APIRouter, Query, Request

from ..core.limiter import limiter
from ..services.aurora import fetch_terms, make_client
from ..services.cached_aurora import cached_aurora_fetch
from ..utils.api_response import ApiResponse
from ..utils.aurora_data import normalize_term_items
from ..utils.errors import aurora_error_handling
from ..utils.pagination import paginated_page

router = APIRouter()


@router.get("/terms")
@limiter.limit("30/minute")
async def get_terms(
    request: Request,
    offset: int = Query(1, ge=1),
    max: int = Query(10, ge=1, le=50),
    searchTerm: str = Query("", alias="searchTerm", max_length=50),
) -> ApiResponse:
    cache_key = f"terms:{searchTerm}:{offset}:{max}"

    async def fetcher():
        async with make_client() as client:
            return await fetch_terms(
                client,
                offset=offset,
                max_items=max,
                search_term=searchTerm,
            )

    with aurora_error_handling("fetching terms"):
        result = await cached_aurora_fetch(cache_key, fetcher)
        payload = paginated_page(normalize_term_items(result["data"]), offset, max)
        return ApiResponse.from_result(result, data=payload)
