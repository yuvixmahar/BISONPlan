import asyncio
import time

import httpx

from ..cache import cache
from ..services.aurora import fetch_courses, fetch_description, init_term_session, make_client
from ..services.description import empty_course_detail, merge_course_with_description


async def scrape_subject(
    subject: str, term: str, include_descriptions: bool = True
) -> list[dict]:
    """
    Scrape all courses for one subject and term.

    Steps:
        1) init_term_session
        2) fetch_courses (all pages)
        3) optionally fetch_description in batches of 5 with 0.5s sleep between batches
        4) merge course data + parsed description into one dict per section
    """

    results: list[dict] = []

    async with make_client() as client:
        await init_term_session(client, term)
        courses = await fetch_courses(client, subject, term)

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

            await asyncio.sleep(0.5)  # be polite to Aurora

    return results


async def scrape_subject_cached(
    subject: str, term: str, include_descriptions: bool = True
) -> dict:
    """
    Cache-aware wrapper around scrape_subject.

    Returns:
      {
        "source": "live" | "stale",
        "cached_at": float | None,
        "data": [...]
      }
    """

    detail_mode = "full" if include_descriptions else "basic"
    key = f"courses:{term}:{subject}:{detail_mode}"
    stale_entry = cache.get(key)

    if stale_entry and cache.is_fresh(key):
        cached_at, data = stale_entry
        return {"source": "live", "cached_at": int(cached_at), "data": data}

    if stale_entry and cache.is_stale(key):
        cached_at, stale_data = stale_entry
        try:
            fresh_data = await scrape_subject(subject, term, include_descriptions)
            cache.set(key, fresh_data)
            return {"source": "live", "cached_at": int(time.time()), "data": fresh_data}
        except (httpx.HTTPStatusError, httpx.RequestError):
            return {"source": "stale", "cached_at": int(cached_at), "data": stale_data}

    fresh_data = await scrape_subject(subject, term, include_descriptions)
    cache.set(key, fresh_data)
    return {"source": "live", "cached_at": int(time.time()), "data": fresh_data}
