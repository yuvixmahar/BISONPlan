import httpx
from fastapi import APIRouter, HTTPException, Query

from ..services.aurora import fetch_subjects, init_term_session, make_client

router = APIRouter()


def _wrap(success: bool, source: str, cached_at: int | None, data):
    return {"success": success, "source": source, "cached_at": cached_at, "data": data}


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

        normalized: list[dict[str, str]] = []
        for item in page:
            if not isinstance(item, dict):
                continue
            code = item.get("code")
            if not code:
                continue
            description = item.get("description") or code
            normalized.append({"code": str(code), "description": str(description)})

        has_more = len(normalized) >= max
        data = {
            "items": normalized,
            "offset": offset,
            "max": max,
            "searchTerm": searchTerm,
            "has_more": has_more,
            "next_offset": offset + 1 if has_more else None,
        }
        return _wrap(True, "live", None, data)
    except (httpx.HTTPStatusError, httpx.RequestError) as e:
        raise HTTPException(
            status_code=503,
            detail=f"Aurora is unreachable (error while fetching subjects): {type(e).__name__}",
        )

