import time

from fastapi import APIRouter, Query, Request

from ..cache import DAILY_TTL_SECONDS, cache
from ..db import read_terms_async, upsert_terms_async
from ..limiter import limiter
from ..services.aurora import AuroraBudgetBlocked, fetch_all_terms, make_client
from ..utils.api_response import api_response
from ..utils.aurora_data import normalize_term_items
from ..utils.errors import AURORA_ERRORS, aurora_budget_error, aurora_unavailable_error

router = APIRouter()

_FALLBACK_CACHE_KEY = "terms:all:fallback"


def _apply_pagination(items: list, offset: int, max_items: int) -> dict:
    start = (offset - 1) * max_items
    page = items[start : start + max_items]
    has_more = start + max_items < len(items)
    return {
        "items": page,
        "offset": offset,
        "max": max_items,
        "has_more": has_more,
        "next_offset": offset + 1 if has_more else None,
    }


def _filter(items: list[dict], search: str) -> list[dict]:
    if not search:
        return items
    q = search.lower()
    return [t for t in items if q in t["code"].lower() or q in t["description"].lower()]


@router.get("/terms")
@limiter.limit("30/minute")
async def get_terms(
    request: Request,
    offset: int = Query(1, ge=1),
    max: int = Query(10, ge=1, le=50),
    searchTerm: str = Query("", alias="searchTerm", max_length=50),
):
    # ── 1. Try SQLite (populated by scheduler every 24 h) ─────────────────────
    try:
        all_terms, cached_at = await read_terms_async()
        if all_terms:
            payload = _apply_pagination(_filter(all_terms, searchTerm), offset, max)
            return api_response(True, "live", cached_at, payload)
    except Exception:
        pass  # fall through to Aurora

    # ── 2. Fallback: fetch all from Aurora, cache in memory + SQLite ──────────
    try:
        mem_entry = cache.get(_FALLBACK_CACHE_KEY)
        if mem_entry and cache.is_fresh(_FALLBACK_CACHE_KEY):
            cached_at, all_terms = mem_entry
        else:
            async with make_client() as client:
                raw = await fetch_all_terms(client)
            all_terms = normalize_term_items(raw)
            now = int(time.time())
            cache.set(_FALLBACK_CACHE_KEY, all_terms, ttl=DAILY_TTL_SECONDS)
            try:
                await upsert_terms_async(all_terms, now)
            except Exception:
                pass
            cached_at = now

        payload = _apply_pagination(_filter(all_terms, searchTerm), offset, max)
        return api_response(True, "live", cached_at, payload)
    except AuroraBudgetBlocked as e:
        raise aurora_budget_error(e)
    except AURORA_ERRORS as e:
        raise aurora_unavailable_error("fetching terms", e)
