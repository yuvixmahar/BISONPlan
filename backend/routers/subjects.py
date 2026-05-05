import httpx
from fastapi import APIRouter, HTTPException, Query

from ..services.aurora import fetch_subjects, init_term_session, make_client

router = APIRouter()


def _wrap(success: bool, source: str, cached_at: int | None, data):
    return {"success": success, "source": source, "cached_at": cached_at, "data": data}


@router.get("/subjects")
async def get_subjects(
    term: str = Query(..., min_length=1),
):
    try:
        async with make_client() as client:
            await init_term_session(client, term)
            subject_codes = await fetch_subjects(client, term)

        # Aurora's subject endpoint is not guaranteed to provide descriptions.
        # Provide a placeholder description for now (same as code) so the
        # frontend can render a clean dropdown immediately.
        data = [{"code": code, "description": code} for code in subject_codes]
        return _wrap(True, "live", None, data)
    except (httpx.HTTPStatusError, httpx.RequestError) as e:
        raise HTTPException(
            status_code=503,
            detail=f"Aurora is unreachable (error while fetching subjects): {type(e).__name__}",
        )

