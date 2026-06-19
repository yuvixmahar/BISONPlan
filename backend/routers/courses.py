from fastapi import APIRouter, Path, Query, Request

from ..config import cache_ttl_seconds
from ..limiter import limiter
from ..services.aurora import (
    AuroraBudgetBlocked,
    fetch_description,
    init_term_session,
    make_client,
)
from ..services.cached_aurora import cached_aurora_fetch
from ..services.description import build_course_detail
from ..services.scraper import scrape_subject_cached, scrape_subject_page_cached
from ..utils.api_response import api_response
from ..utils.errors import AURORA_ERRORS, aurora_budget_error, aurora_unavailable_error
from ..utils.validation import CRN_PATTERN, SUBJECT_CODE_PATTERN, TERM_CODE_PATTERN

router = APIRouter()


@router.get("/courses")
@limiter.limit("30/minute")
async def get_courses(
    request: Request,
    subject: str = Query(..., min_length=2, max_length=10, pattern=SUBJECT_CODE_PATTERN),
    term: str = Query(..., min_length=6, max_length=6, pattern=TERM_CODE_PATTERN),
    includeDescriptions: bool = Query(False, alias="includeDescriptions"),
    offset: int = Query(0, ge=0),
    limit: int | None = Query(None, ge=1, le=500),
):
    try:
        # Paginated basic fetch: one page at a time so the course-search page can
        # paint the first courses fast, then load the rest in the background.
        if limit is not None and not includeDescriptions:
            page = await scrape_subject_page_cached(
                subject=subject.upper(),
                term=term,
                offset=offset,
                max_size=limit,
            )
            return api_response(
                True,
                page["source"],
                page["cached_at"],
                page["data"],
                budget_message=page["budget_message"],
                cache_ttl_seconds=cache_ttl_seconds(),
                total=page["total"],
            )

        result = await scrape_subject_cached(
            subject=subject.upper(),
            term=term,
            include_descriptions=includeDescriptions,
        )
        return api_response(
            True,
            result["source"],
            result["cached_at"],
            result["data"],
            budget_message=result["budget_message"],
            cache_ttl_seconds=cache_ttl_seconds(),
        )
    except AuroraBudgetBlocked as e:
        raise aurora_budget_error(e)
    except AURORA_ERRORS as e:
        raise aurora_unavailable_error("scraping", e)


@router.get("/courses/{crn}/description")
@limiter.limit("20/minute")
async def get_course_description(
    request: Request,
    crn: str = Path(..., min_length=1, max_length=6, pattern=CRN_PATTERN),
    term: str = Query(..., min_length=6, max_length=6, pattern=TERM_CODE_PATTERN),
):
    cache_key = f"description:{term}:{crn}"

    async def fetcher():
        async with make_client() as client:
            await init_term_session(client, term)
            desc = await fetch_description(client, crn, term)
        return build_course_detail(desc)

    try:
        result = await cached_aurora_fetch(cache_key, fetcher)
        return api_response(
            True,
            result["source"],
            result["cached_at"],
            result["data"],
            budget_message=result["budget_message"],
        )
    except AuroraBudgetBlocked as e:
        raise aurora_budget_error(e)
    except AURORA_ERRORS as e:
        raise aurora_unavailable_error("fetching description", e)
