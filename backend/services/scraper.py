import asyncio
import time

import httpx

from ..cache import cache
from ..services.aurora import fetch_courses, fetch_description, fetch_subjects, init_term_session, make_client
from ..services.prereq_parser import parse_prereq


async def scrape_subject(subject: str, term: str) -> list[dict]:
    """
    Scrape all courses + descriptions for one subject and term.

    Steps:
        1) init_term_session
        2) fetch_courses (all pages)
        3) fetch_description in batches of 5 with 0.5s sleep between batches
        4) merge course data + parsed description into one dict per section
    """

    results: list[dict] = []

    async with make_client() as client:
        await init_term_session(client, term)
        courses = await fetch_courses(client, subject, term)

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
                prereqs_raw = parsed_desc.get("prerequisites_raw")
                coreqs_raw = parsed_desc.get("corequisites_raw")

                # Construct a combined raw string for prereq_parser.
                combined_raw = None
                if prereqs_raw and coreqs_raw:
                    combined_raw = (
                        f"{prereqs_raw}. Pre- or corequisite: {coreqs_raw}"
                    )
                elif prereqs_raw:
                    combined_raw = prereqs_raw
                elif coreqs_raw:
                    combined_raw = f"Pre- or corequisite: {coreqs_raw}"

                prereq_data = parse_prereq(combined_raw or "")

                merged = {
                    **course,
                    "description": parsed_desc.get("description") or "",
                    "prerequisites_raw": prereqs_raw,
                    "corequisites_raw": coreqs_raw,
                    "prerequisites": prereq_data.get("prerequisites") or [],
                    "corequisites": prereq_data.get("corequisites") or [],
                    "note": prereq_data.get("note"),
                }
                results.append(merged)

            await asyncio.sleep(0.5)  # be polite to Aurora

    return results


async def scrape_subject_cached(subject: str, term: str) -> dict:
    """
    Cache-aware wrapper around scrape_subject.

    Returns:
      {
        "source": "live" | "stale",
        "cached_at": float | None,
        "data": [...]
      }
    """

    key = f"courses:{term}:{subject}"
    stale_entry = cache.get(key)
    now = time.time()

    if stale_entry and cache.is_fresh(key):
        cached_at, data = stale_entry
        return {"source": "live", "cached_at": int(cached_at), "data": data}

    if stale_entry and cache.is_stale(key):
        cached_at, stale_data = stale_entry
        try:
            fresh_data = await scrape_subject(subject, term)
            cache.set(key, fresh_data)
            return {"source": "live", "cached_at": int(time.time()), "data": fresh_data}
        except (httpx.HTTPStatusError, httpx.RequestError):
            return {"source": "stale", "cached_at": int(cached_at), "data": stale_data}

    # No cache or cache is too old -> must be live; failures propagate.
    fresh_data = await scrape_subject(subject, term)
    cache.set(key, fresh_data)
    return {"source": "live", "cached_at": int(time.time()), "data": fresh_data}


async def scrape_all_subjects_cached(term: str) -> dict:
    """
    Convenience endpoint if needed later (not wired to routers yet).
    """

    async with make_client() as client:
        await init_term_session(client, term)
        subjects = await fetch_subjects(client, term)

    return {"subjects": subjects, "term": term}

