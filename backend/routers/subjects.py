from fastapi import APIRouter, Query, Request

from ..limiter import limiter
from ..services.aurora import AuroraBudgetBlocked, fetch_subjects, init_term_session, make_client
from ..services.cached_aurora import cached_aurora_fetch
from ..utils.api_response import api_response
from ..utils.aurora_data import normalize_subject_items
from ..utils.errors import AURORA_ERRORS, aurora_budget_error, aurora_unavailable_error
from ..utils.pagination import paginated_page
from ..utils.validation import SESSION_ID_MAX_LENGTH, TERM_CODE_PATTERN

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
):
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

    try:
        result = await cached_aurora_fetch(cache_key, fetcher)
        data = {
            **paginated_page(normalize_subject_items(result["data"]), offset, max),
            "searchTerm": searchTerm,
        }
        return api_response(
            True,
            result["source"],
            result["cached_at"],
            data,
            budget_message=result["budget_message"],
        )
    except AuroraBudgetBlocked as e:
        raise aurora_budget_error(e)
    except AURORA_ERRORS as e:
        raise aurora_unavailable_error("fetching subjects", e)
