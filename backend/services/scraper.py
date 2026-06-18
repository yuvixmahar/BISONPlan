import asyncio

from ..cache import cache
from ..services.aurora import (
    AuroraBudgetBlocked,
    fetch_courses,
    fetch_description,
    init_term_session,
    make_client,
)
from ..services.cached_aurora import cached_aurora_fetch
from ..services.description import empty_course_detail, merge_course_with_description
from ..utils.errors import AURORA_ERRORS
from ..utils.text import decode_aurora_strings


async def scrape_subject(
    subject: str, term: str, include_descriptions: bool = True
) -> list[dict]:
    results: list[dict] = []

    async with make_client() as client:
        await init_term_session(client, term)
        courses = [decode_aurora_strings(course) for course in await fetch_courses(client, subject, term)]

        if not include_descriptions:
            detail = empty_course_detail()
            return [{**course, **detail} for course in courses]

        batch_size = 5
        for i in range(0, len(courses), batch_size):
            batch = courses[i : i + batch_size]
            descriptions = await asyncio.gather(
                *[
                    fetch_description(client, str(c.get("courseReferenceNumber")), term)
                    for c in batch
                ]
            )

            for course, parsed_desc in zip(batch, descriptions):
                results.append(merge_course_with_description(course, parsed_desc))

            await asyncio.sleep(0.5)

    return results


async def scrape_subject_cached(
    subject: str, term: str, include_descriptions: bool = True
) -> dict:
    detail_mode = "full" if include_descriptions else "basic"
    key = f"courses:{term}:{subject}:{detail_mode}"

    async def fetcher():
        return await scrape_subject(subject, term, include_descriptions)

    try:
        result = await cached_aurora_fetch(key, fetcher)
        return {
            "source": result["source"],
            "cached_at": result["cached_at"],
            "data": result["data"],
            "budget_blocked": result["budget_blocked"],
            "budget_message": result["budget_message"],
        }
    except AuroraBudgetBlocked as exc:
        stale_entry = cache.get(key)
        if stale_entry:
            cached_at, stale_data = stale_entry
            return {
                "source": "cached_only",
                "cached_at": int(cached_at),
                "data": stale_data,
                "budget_blocked": True,
                "budget_message": exc.message,
            }
        raise
    except AURORA_ERRORS:
        stale_entry = cache.get(key)
        if stale_entry and cache.is_stale(key):
            cached_at, stale_data = stale_entry
            return {
                "source": "stale",
                "cached_at": int(cached_at),
                "data": stale_data,
                "budget_blocked": False,
                "budget_message": None,
            }
        raise
