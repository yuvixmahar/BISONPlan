import httpx
from fastapi import APIRouter, HTTPException, Query

from ..services.aurora import fetch_description, init_term_session, make_client
from ..services.prereq_parser import parse_prereq
from ..services.scraper import scrape_subject_cached

router = APIRouter()


def _wrap(success: bool, source: str, cached_at: int | None, data):
    return {"success": success, "source": source, "cached_at": cached_at, "data": data}


@router.get("/courses")
async def get_courses(
    subject: str = Query(..., min_length=1),
    term: str = Query(..., min_length=1),
):
    try:
        result = await scrape_subject_cached(subject=subject, term=term)
        return _wrap(True, result["source"], result["cached_at"], result["data"])
    except (httpx.HTTPStatusError, httpx.RequestError) as e:
        raise HTTPException(
            status_code=503,
            detail=f"Aurora is unreachable (error while scraping): {type(e).__name__}",
        )


@router.get("/courses/{crn}/description")
async def get_course_description(
    crn: str,
    term: str = Query(..., min_length=1),
):
    try:
        async with make_client() as client:
            await init_term_session(client, term)
            desc = await fetch_description(client, crn, term)

        prereqs_raw = desc.get("prerequisites_raw")
        coreqs_raw = desc.get("corequisites_raw")

        combined_raw = None
        if prereqs_raw and coreqs_raw:
            combined_raw = f"{prereqs_raw}. Pre- or corequisite: {coreqs_raw}"
        elif prereqs_raw:
            combined_raw = prereqs_raw
        elif coreqs_raw:
            combined_raw = f"Pre- or corequisite: {coreqs_raw}"

        parsed = parse_prereq(combined_raw or "")

        data = {
            "description": desc.get("description") or "",
            "prerequisites_raw": prereqs_raw,
            "corequisites_raw": coreqs_raw,
            "prerequisites": parsed.get("prerequisites") or [],
            "corequisites": parsed.get("corequisites") or [],
            "note": parsed.get("note"),
        }
        return _wrap(True, "live", None, data)
    except (httpx.HTTPStatusError, httpx.RequestError) as e:
        raise HTTPException(
            status_code=503,
            detail=f"Aurora is unreachable (error while fetching description): {type(e).__name__}",
        )

