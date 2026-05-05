import httpx
from fastapi import APIRouter, Query

from ..services.aurora import fetch_terms, make_client

router = APIRouter()


def _wrap(success: bool, source: str, cached_at: int | None, data):
    return {"success": success, "source": source, "cached_at": cached_at, "data": data}


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

        normalized: list[dict[str, str]] = []
        for item in page or []:
            if not isinstance(item, dict):
                continue

            term_code = item.get("termCode") or item.get("code") or item.get("term")
            label = item.get("description") or item.get("name") or item.get("label")
            if not term_code:
                continue

            normalized.append(
                {
                    "code": str(term_code),
                    "description": str(label or str(term_code)),
                }
            )

        has_more = len(normalized) >= max
        return _wrap(
            True,
            "live",
            None,
            {
                "items": normalized,
                "offset": offset,
                "max": max,
                "has_more": has_more,
                "next_offset": offset + 1 if has_more else None,
            },
        )
    except (httpx.HTTPStatusError, httpx.RequestError):
        return _wrap(
            True,
            "stale",
            None,
            {
                "items": [],
                "offset": offset,
                "max": max,
                "has_more": False,
                "next_offset": None,
            },
        )

