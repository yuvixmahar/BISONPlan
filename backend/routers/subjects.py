import time

from fastapi import APIRouter, Query, Request

from ..cache import DAILY_TTL_SECONDS, cache
from ..config import TERMS as PRIORITY_TERMS
from ..db import read_subjects_async, upsert_subjects_async
from ..limiter import limiter
from ..services.aurora import (
    AuroraBudgetBlocked,
    fetch_all_subjects,
    init_term_session,
    make_client,
)
from ..utils.api_response import api_response
from ..utils.aurora_data import normalize_subject_items
from ..utils.errors import AURORA_ERRORS, aurora_budget_error, aurora_unavailable_error
from ..utils.validation import TERM_CODE_PATTERN

router = APIRouter()

PRIORITY_TERM_CODES = set(PRIORITY_TERMS.values())


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
    return [s for s in items if q in s["code"].lower() or q in s["description"].lower()]


async def _subjects_from_db_or_aurora(term: str) -> tuple[list[dict], int]:
    """For priority terms: try SQLite first, fall back to Aurora and persist."""
    try:
        db_items, cached_at = await read_subjects_async(term)
        if db_items:
            return db_items, cached_at
    except Exception:
        pass

    async with make_client() as client:
        await init_term_session(client, term)
        raw = await fetch_all_subjects(client, term)
    normalized = normalize_subject_items(raw)
    now = int(time.time())
    try:
        await upsert_subjects_async(term, normalized, now)
    except Exception:
        pass
    return normalized, now


async def _subjects_from_memory_or_aurora(term: str) -> tuple[list[dict], int]:
    """For non-priority terms: in-memory cache with DAILY_TTL, no DB write."""
    key = f"subjects:all:{term}"
    entry = cache.get(key)
    if entry and cache.is_fresh(key):
        cached_at, items = entry
        return items, int(cached_at)

    async with make_client() as client:
        await init_term_session(client, term)
        raw = await fetch_all_subjects(client, term)
    normalized = normalize_subject_items(raw)
    now = int(time.time())
    cache.set(key, normalized, ttl=DAILY_TTL_SECONDS)
    return normalized, now


@router.get("/subjects")
@limiter.limit("30/minute")
async def get_subjects(
    request: Request,
    term: str = Query(..., min_length=6, max_length=6, pattern=TERM_CODE_PATTERN),
    searchTerm: str = Query("", alias="searchTerm", max_length=50),
    offset: int = Query(1, ge=1),
    max: int = Query(10, ge=1, le=50),
):
    try:
        if term in PRIORITY_TERM_CODES:
            all_subjects, cached_at = await _subjects_from_db_or_aurora(term)
        else:
            all_subjects, cached_at = await _subjects_from_memory_or_aurora(term)

        data = {
            **_apply_pagination(_filter(all_subjects, searchTerm), offset, max),
            "searchTerm": searchTerm,
        }
        return api_response(True, "live", cached_at, data)
    except AuroraBudgetBlocked as e:
        raise aurora_budget_error(e)
    except AURORA_ERRORS as e:
        raise aurora_unavailable_error("fetching subjects", e)
