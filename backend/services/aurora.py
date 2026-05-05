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


async def fetch_subjects(client: httpx.AsyncClient, term: str) -> list[str]:
    """
    GET /classSearch/get_subject with pagination.
    Returns subject codes e.g. ["ACC", "ECE", "MATH", ...]
    """

    subjects: list[str] = []
    offset = 1
    max_per_page = 50

    while True:
        r = await client.get(
            f"{BASE_URL}/classSearch/get_subject",
            params={
                "searchTerm": "",
                "term": term,
                "offset": offset,
                "max": max_per_page,
            },
        )
        r.raise_for_status()
        data = r.json()
        if not data:
            break

        # Each entry is usually an object with "code"
        for s in data:
            if isinstance(s, dict) and "code" in s:
                subjects.append(str(s["code"]))

        if len(data) < max_per_page:
            break

        offset += max_per_page

    # Deduplicate
    seen: set[str] = set()
    uniq: list[str] = []
    for code in subjects:
        if code not in seen:
            seen.add(code)
            uniq.append(code)

    return uniq


async def fetch_terms(client: httpx.AsyncClient) -> list[dict]:
    """
    GET /classSearch/getTerms with a large max to get all available terms.
    """

    r = await client.get(
        f"{BASE_URL}/classSearch/getTerms",
        params={"searchTerm": "", "offset": 1, "max": 5000},
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

