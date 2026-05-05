import httpx

from ..config import BASE_URL, HEADERS, aurora_cookies
from ..utils.html_parser import parse_description_html


def _client_with_defaults() -> httpx.AsyncClient:
    # Centralize request defaults per spec.
    return httpx.AsyncClient(
        cookies=aurora_cookies(),
        headers=HEADERS,
        timeout=30,
    )


async def init_term_session(client: httpx.AsyncClient, term: str) -> None:
    """
    Banner SSB requires two steps before search works:
        1) Validate term exists via getTerms
        2) POST to term/search to set server-side term in session

    Without step (2), searchResults always returns totalCount: 0.
    """

    r = await client.get(
        f"{BASE_URL}/classSearch/getTerms",
        params={"searchTerm": term, "offset": 1, "max": 1},
    )
    r.raise_for_status()

    r = await client.post(
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
        r = await client.get(
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

    r = await client.post(
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

    r = await client.get(
        f"{BASE_URL}/classSearch/get_subject",
        params=params,
    )
    r.raise_for_status()
    payload = r.json()
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and isinstance(payload.get("data"), list):
        return payload["data"]
    return []


async def fetch_terms(
    client: httpx.AsyncClient, offset: int = 1, max_items: int = 10, search_term: str = ""
) -> list[dict]:
    """
    GET /classSearch/getTerms with pagination.
    """

    r = await client.get(
        f"{BASE_URL}/classSearch/getTerms",
        params={"searchTerm": search_term, "offset": offset, "max": max_items},
    )
    r.raise_for_status()

    payload = r.json()
    # Depending on Aurora response shape, this may be a list already.
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and "data" in payload and isinstance(payload["data"], list):
        return payload["data"]
    return []


# Optional convenience for callers that don't already have a client.
def make_client() -> httpx.AsyncClient:
    return _client_with_defaults()

