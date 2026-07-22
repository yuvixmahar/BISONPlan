import asyncio

from backend.services.aurora import (
    fetch_courses,
    fetch_courses_page,
    fetch_description,
    init_term_session,
    make_client,
)
from backend.services.cached_aurora import cached_aurora_fetch
from backend.services.description import empty_course_detail, merge_course_with_description
from backend.utils.text import decode_aurora_strings


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


async def scrape_subject_page(
    subject: str, term: str, offset: int, max_size: int
) -> tuple[list[dict], int]:
    """
    Fetch one page of basic course data (no descriptions). Used by the course
    search page so the first courses paint fast while the rest load in the
    background. Returns (courses, total_count).
    """
    async with make_client() as client:
        await init_term_session(client, term)
        raw, total = await fetch_courses_page(client, subject, term, offset, max_size)

    detail = empty_course_detail()
    data = [{**decode_aurora_strings(course), **detail} for course in raw]
    return data, total


async def scrape_subject_page_cached(
    subject: str, term: str, offset: int, max_size: int
) -> dict:
    key = f"courses:{term}:{subject}:basic:page:{offset}:{max_size}"

    async def fetcher():
        items, total = await scrape_subject_page(subject, term, offset, max_size)
        return {"items": items, "total": total}

    result = await cached_aurora_fetch(key, fetcher)
    payload = result["data"]
    return {
        "source": result["source"],
        "cached_at": result["cached_at"],
        "data": payload["items"],
        "total": payload["total"],
    }


async def scrape_subject_cached(
    subject: str, term: str, include_descriptions: bool = True
) -> dict:
    detail_mode = "full" if include_descriptions else "basic"
    key = f"courses:{term}:{subject}:{detail_mode}"

    async def fetcher():
        return await scrape_subject(subject, term, include_descriptions)

    return await cached_aurora_fetch(key, fetcher)
