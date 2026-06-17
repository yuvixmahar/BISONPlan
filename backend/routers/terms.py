from fastapi import APIRouter, Query

from ..services.aurora import fetch_terms, make_client
from ..utils.api_response import api_response
from ..utils.aurora_data import normalize_term_items
from ..utils.errors import AURORA_ERRORS, aurora_unavailable_error
from ..utils.pagination import paginated_page

router = APIRouter()


@router.get("/terms")
async def get_terms(
    offset: int = Query(1, ge=1),
    max: int = Query(10, ge=1, le=50),
    searchTerm: str = Query("", alias="searchTerm"),
):
    try:
        async with make_client() as client:
            page = await fetch_terms(
                client,
                offset=offset,
                max_items=max,
                search_term=searchTerm,
            )

        return api_response(
            True,
            "live",
            None,
            paginated_page(normalize_term_items(page), offset, max),
        )
    except AURORA_ERRORS as e:
        raise aurora_unavailable_error("fetching terms", e)
