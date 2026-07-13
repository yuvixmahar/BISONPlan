from fastapi import APIRouter, Query, Request

from backend.core.limiter import limiter
from backend.services.aurora import fetch_subjects, init_term_session, make_client
from backend.services.cached_aurora import cached_aurora_fetch
from backend.utils.api_response import ApiResponse
from backend.utils.aurora_data import normalize_subject_items
from backend.utils.errors import aurora_error_handling
from backend.utils.pagination import paginated_page
from backend.utils.validation import SESSION_ID_MAX_LENGTH, TERM_CODE_PATTERN

router = APIRouter()


@router.get("/subjects")
@limiter.limit("30/minute")
async def get_subjects(
    request: Request,
    term: str = Query(..., min_length=6, max_length=6, pattern=TERM_CODE_PATTERN),
    searchTerm: str = Query("", alias="searchTerm", max_length=50),
    offset: int = Query(1, ge=1),
    max: int = Query(10, ge=1, le=50),
    uniqueSessionId: str | None = Query(None, alias="uniqueSessionId", max_length=SESSION_ID_MAX_LENGTH),
) -> ApiResponse:
    session_key = uniqueSessionId or ""
    cache_key = f"subjects:{term}:{searchTerm}:{offset}:{max}:{session_key}"

    async def fetcher():
        async with make_client() as client:
            await init_term_session(client, term)
            return await fetch_subjects(
                client,
                term=term,
                search_term=searchTerm,
                offset=offset,
                max_items=max,
                unique_session_id=uniqueSessionId,
            )

    with aurora_error_handling("fetching subjects"):
        result = await cached_aurora_fetch(cache_key, fetcher)
        data = {
            **paginated_page(normalize_subject_items(result["data"]), offset, max),
            "searchTerm": searchTerm,
        }
        return ApiResponse.from_result(result, data=data)
