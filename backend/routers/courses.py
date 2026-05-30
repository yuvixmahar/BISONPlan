from fastapi import APIRouter, Query

from ..services.aurora import fetch_description, init_term_session, make_client
from ..services.description import build_course_detail
from ..services.scraper import scrape_subject_cached
from ..utils.api_response import api_response
from ..utils.errors import AURORA_ERRORS, aurora_unavailable_error

router = APIRouter()


@router.get("/courses")
async def get_courses(
    subject: str = Query(..., min_length=1),
    term: str = Query(..., min_length=1),
    includeDescriptions: bool = Query(False, alias="includeDescriptions"),
):
    try:
        result = await scrape_subject_cached(
            subject=subject,
            term=term,
            include_descriptions=includeDescriptions,
        )
        return api_response(True, result["source"], result["cached_at"], result["data"])
    except AURORA_ERRORS as e:
        raise aurora_unavailable_error("scraping", e)


@router.get("/courses/{crn}/description")
async def get_course_description(
    crn: str,
    term: str = Query(..., min_length=1),
):
    try:
        async with make_client() as client:
            await init_term_session(client, term)
            desc = await fetch_description(client, crn, term)

        return api_response(True, "live", None, build_course_detail(desc))
    except AURORA_ERRORS as e:
        raise aurora_unavailable_error("fetching description", e)
