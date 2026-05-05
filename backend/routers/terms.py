import httpx
import re

from fastapi import APIRouter, HTTPException

from ..config import TERMS
from ..services.aurora import fetch_terms, init_term_session, make_client

router = APIRouter()


def _wrap(success: bool, source: str, cached_at: int | None, data):
    return {"success": success, "source": source, "cached_at": cached_at, "data": data}


def _slugify(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s


@router.get("/terms")
async def get_terms():
    # Start with hardcoded terms.
    merged: dict[str, str] = dict(TERMS)

    try:
        async with make_client() as client:
            # init_term_session isn't strictly required for getTerms, but it's
            # cheap and keeps Aurora session consistent.
            await init_term_session(client, next(iter(TERMS.values())))
            dynamic_terms = await fetch_terms(client)

        # Normalize various Aurora payload shapes into "slug -> termCode".
        for item in dynamic_terms or []:
            if not isinstance(item, dict):
                continue

            term_code = item.get("termCode") or item.get("code") or item.get("term") or None
            label = item.get("description") or item.get("name") or item.get("label") or ""
            if not term_code:
                continue

            key = _slugify(label) or f"term_{term_code}"
            if key not in merged:
                merged[key] = str(term_code)

        return _wrap(True, "live", None, merged)
    except (httpx.HTTPStatusError, httpx.RequestError):
        # If Aurora is down, still return hardcoded terms.
        return _wrap(True, "stale", None, merged)

