import httpx

from ..config import BASE_URL, aurora_cookies, aurora_headers
from ..utils.aurora_data import json_list
from ..utils.html_parser import parse_description_html
from .aurora_budget import AuroraBudgetBlocked, aurora_budget


def make_client(timeout: float = 30) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        cookies=aurora_cookies(),
        headers=aurora_headers(),
        timeout=timeout,
    )


async def _request(client: httpx.AsyncClient, method: str, url: str, **kwargs):
    aurora_budget.assert_can_request()
    aurora_budget.record_request()
    request_fn = client.get if method == "GET" else client.post
    return await request_fn(url, **kwargs)


async def init_term_session(client: httpx.AsyncClient, term: str) -> None:
    """
    Banner SSB requires two steps before search works:
        1) Validate term exists via getTerms
        2) POST to term/search to set server-side term in session

    Without step (2), searchResults always returns totalCount: 0.
    """

    r = await _request(
        client,
        "GET",
        f"{BASE_URL}/classSearch/getTerms",
        params={"searchTerm": term, "offset": 1, "max": 1},
    )
    r.raise_for_status()

    r = await _request(
        client,
        "POST",
        f"{BASE_URL}/term/search",
        params={"mode": "search"},
        data={
            "term": term,
            "studyPath": "",
            "studyPathText": "",
            "startDatepicker": "",
            "endDatepicker": "",
        },
    )
    r.raise_for_status()


async def fetch_courses(client: httpx.AsyncClient, subject: str, term: str) -> list[dict]:
    """
    GET /searchResults/searchResults with pagination.
    Loop until all pages are fetched based on totalCount.
    """

    all_courses: list[dict] = []
    page_size = 50
    offset = 0

    while True:
        r = await _request(
            client,
            "GET",
            f"{BASE_URL}/searchResults/searchResults",
            params={
                "txt_subject": subject,
                "txt_term": term,
                "startDatepicker": "",
                "endDatepicker": "",
                "pageOffset": offset,
                "pageMaxSize": page_size,
                "sortColumn": "subjectDescription",
                "sortDirection": "asc",
            },
        )
        r.raise_for_status()

        payload = r.json()
        total = int(payload.get("totalCount") or 0)
        courses = payload.get("data") or []

        all_courses.extend(courses)
        if len(all_courses) >= total:
            break

        offset += page_size

    return all_courses


async def fetch_description(client: httpx.AsyncClient, crn: str, term: str) -> dict:
    """
    POST /searchResults/getCourseDescription.
    Returns raw HTML; parse it with html_parser.py.
    """

    r = await _request(
        client,
        "POST",
        f"{BASE_URL}/searchResults/getCourseDescription",
        data={"term": term, "courseReferenceNumber": crn},
    )
    r.raise_for_status()
    return parse_description_html(r.text)


async def fetch_subjects(
    client: httpx.AsyncClient,
    term: str,
    search_term: str = "",
    offset: int = 1,
    max_items: int = 10,
    unique_session_id: str | None = None,
) -> list[dict]:
    """
    GET /classSearch/get_subject page.
    Returns one page of subject objects with code/description.
    """
    params = {
        "searchTerm": search_term,
        "term": term,
        "offset": offset,
        "max": max_items,
    }
    if unique_session_id:
        params["uniqueSessionId"] = unique_session_id

    r = await _request(
        client,
        "GET",
        f"{BASE_URL}/classSearch/get_subject",
        params=params,
    )
    r.raise_for_status()
    return json_list(r.json())


async def fetch_terms(
    client: httpx.AsyncClient, offset: int = 1, max_items: int = 10, search_term: str = ""
) -> list[dict]:
    """
    GET /classSearch/getTerms with pagination.
    """

    r = await _request(
        client,
        "GET",
        f"{BASE_URL}/classSearch/getTerms",
        params={"searchTerm": search_term, "offset": offset, "max": max_items},
    )
    r.raise_for_status()
    return json_list(r.json())


async def fetch_all_terms(client: httpx.AsyncClient) -> list[dict]:
    """Fetch every term from Aurora in one go (loops pages until exhausted)."""
    all_items: list[dict] = []
    page_size = 50
    offset = 1
    while True:
        page = await fetch_terms(client, offset=offset, max_items=page_size)
        all_items.extend(page)
        if len(page) < page_size:
            break
        offset += page_size
    return all_items


async def fetch_all_subjects(client: httpx.AsyncClient, term: str) -> list[dict]:
    """Fetch every subject for a term from Aurora in one go (loops pages until exhausted)."""
    all_items: list[dict] = []
    page_size = 50
    offset = 1
    while True:
        page = await fetch_subjects(client, term=term, search_term="", offset=offset, max_items=page_size)
        all_items.extend(page)
        if len(page) < page_size:
            break
        offset += page_size
    return all_items


__all__ = [
    "AuroraBudgetBlocked",
    "make_client",
    "init_term_session",
    "fetch_courses",
    "fetch_description",
    "fetch_subjects",
    "fetch_terms",
    "fetch_all_terms",
    "fetch_all_subjects",
]
