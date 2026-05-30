from fastapi import APIRouter, Query

from ..services.aurora import fetch_subjects, init_term_session, make_client
from ..utils.api_response import api_response
from ..utils.aurora_data import normalize_subject_items
from ..utils.errors import AURORA_ERRORS, aurora_unavailable_error
from ..utils.pagination import paginated_page

router = APIRouter()


@router.get("/subjects")
async def get_subjects(
    term: str = Query(..., min_length=1),
    searchTerm: str = Query("", alias="searchTerm"),
    offset: int = Query(1, ge=1),
    max: int = Query(10, ge=1, le=50),
    uniqueSessionId: str | None = Query(None, alias="uniqueSessionId"),
):
    try:
        async with make_client() as client:
            await init_term_session(client, term)
            page = await fetch_subjects(
                client,
                term=term,
                search_term=searchTerm,
                offset=offset,
                max_items=max,
                unique_session_id=uniqueSessionId,
            )

        data = {
            **paginated_page(normalize_subject_items(page), offset, max),
            "searchTerm": searchTerm,
        }
        return api_response(True, "live", None, data)
    except AURORA_ERRORS as e:
        raise aurora_unavailable_error("fetching subjects", e)
