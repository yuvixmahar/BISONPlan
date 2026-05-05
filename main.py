import httpx
import re
import json
import asyncio
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

COOKIES = {
    "BIGipServer~INB_SSB_Flex~Banner_Self_Service_Registration_BANPROD_pool": "!dz2AJkyNIE/z/09ZY...",
    "cf_clearance": "kRVtl3haXztx...",
    "JSESSIONID": "8F52EB3056551E540D3E3B75A57F1776",
    "TS01c6c21c": "010e840441b5706c715bcfa9839771b8b93ba7abc7e743fd267d431505f9797fd...",
}

HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Referer": "https://aurora-registration.umanitoba.ca/StudentRegistrationSsb/ssb/classSearch",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}

BASE_URL = "https://aurora-registration.umanitoba.ca/StudentRegistrationSsb/ssb"

TERMS = {
    "summer_2026": "202650",
    "fall_2026":   "202690",
    "winter_2027": "202710",
}

# ---------------------------------------------------------------------------
# Parser
# ---------------------------------------------------------------------------

def parse_description_html(html: str) -> dict:
    """Extract description, prerequisites, and corequisites from Aurora's HTML fragment."""
    soup = BeautifulSoup(html, "html.parser")
    section = soup.find("section", {"aria-labelledby": "courseDescription"})

    if not section:
        return {"description": None, "prerequisites_raw": None, "corequisites_raw": None}

    text = section.get_text(separator=" ", strip=True)

    # Split on "Prerequisite(s):"
    prereq_split = re.split(r'Prerequisites?\s*:', text, flags=re.IGNORECASE)
    description = prereq_split[0].strip()
    prereq_block = prereq_split[1].strip() if len(prereq_split) > 1 else None

    prereq_raw = None
    coreq_raw = None

    if prereq_block:
        # Split off "Pre- or corequisite(s):" if present
        coreq_split = re.split(r'Pre-\s*or\s*corequisites?\s*:', prereq_block, flags=re.IGNORECASE)
        prereq_part = coreq_split[0].strip().rstrip(".")
        prereq_raw = prereq_part if prereq_part else None
        coreq_raw = coreq_split[1].strip().rstrip(".") if len(coreq_split) > 1 else None

    return {
        "description": description,
        "prerequisites_raw": prereq_raw,
        "corequisites_raw": coreq_raw,
    }

# ---------------------------------------------------------------------------
# Aurora API calls
# ---------------------------------------------------------------------------

async def init_term_session(client: httpx.AsyncClient, term: str) -> None:
    """
    Banner SSB requires two steps before search works:
      1. Validate the term exists via getTerms
      2. POST to term/search to set the term in the server-side session
    Without step 2, searchResults always returns totalCount: 0.
    """
    r = await client.get(
        f"{BASE_URL}/classSearch/getTerms",
        params={"searchTerm": term, "offset": 1, "max": 1},
    )
    r.raise_for_status()
    print(f"getTerms: {r.status_code} — {r.text.strip()[:80]}")

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
    print(f"term/search: {r.status_code} — {r.text.strip()[:80]}")


async def fetch_courses(client: httpx.AsyncClient, subject: str, term: str) -> list:
    """Paginate through all sections for a given subject and term."""
    all_courses = []
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
        data = r.json()
        total = data.get("totalCount", 0)
        courses = data.get("data") or []
        all_courses.extend(courses)
        print(f"  Fetched {len(all_courses)}/{total} sections...")

        if len(all_courses) >= total:
            break

        offset += page_size

    return all_courses


async def fetch_description(client: httpx.AsyncClient, crn: str, term: str) -> dict:
    """Fetch and parse the course description HTML for a single CRN."""
    r = await client.post(
        f"{BASE_URL}/searchResults/getCourseDescription",
        data={"term": term, "courseReferenceNumber": crn},
    )
    r.raise_for_status()
    return parse_description_html(r.text)


async def fetch_subjects(client: httpx.AsyncClient, term: str) -> list[str]:
    """Fetch all subject codes available for a given term."""
    subjects = []
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
        subjects.extend(s["code"] for s in data)
        if len(data) < max_per_page:
            break
        offset += max_per_page

    return subjects

# ---------------------------------------------------------------------------
# Scraper
# ---------------------------------------------------------------------------

async def scrape_subject(subject: str, term: str) -> list[dict]:
    """Scrape all courses + descriptions for one subject."""
    async with httpx.AsyncClient(cookies=COOKIES, headers=HEADERS, timeout=30) as client:
        await init_term_session(client, term)

        courses = await fetch_courses(client, subject, term)
        print(f"Found {len(courses)} sections for {subject}")

        results = []
        batch_size = 5

        for i in range(0, len(courses), batch_size):
            batch = courses[i : i + batch_size]
            descriptions = await asyncio.gather(*[
                fetch_description(client, c["courseReferenceNumber"], term)
                for c in batch
            ])
            for course, desc in zip(batch, descriptions):
                results.append({**course, **desc})

            await asyncio.sleep(0.5)  # be polite to Aurora

        return results


async def scrape_all_subjects(term: str) -> list[dict]:
    """Scrape every subject for a given term."""
    async with httpx.AsyncClient(cookies=COOKIES, headers=HEADERS, timeout=30) as client:
        await init_term_session(client, term)
        subjects = await fetch_subjects(client, term)
        print(f"Found {len(subjects)} subjects: {subjects[:10]}...")

    # Scrape each subject sequentially to avoid hammering Aurora
    all_results = []
    for subject in subjects:
        results = await scrape_subject(subject, term)
        all_results.extend(results)
        print(f"  {subject}: {len(results)} sections (total so far: {len(all_results)})")

    return all_results

# ---------------------------------------------------------------------------
# Quick single-CRN test
# ---------------------------------------------------------------------------

async def test_single(crn: str = "11271", term: str = "202690") -> None:
    """Hit one CRN and print the parsed result. Good for verifying cookies work."""
    async with httpx.AsyncClient(cookies=COOKIES, headers=HEADERS, timeout=30) as client:
        r = await client.post(
            f"{BASE_URL}/searchResults/getCourseDescription",
            data={"term": term, "courseReferenceNumber": crn},
        )
        print(f"Status: {r.status_code}")
        print(f"Raw HTML:\n{r.text[:500]}\n")
        parsed = parse_description_html(r.text)
        print("Parsed:")
        print(json.dumps(parsed, indent=2))

# ---------------------------------------------------------------------------
# Entry point — change MODE to switch between tasks
# ---------------------------------------------------------------------------
#
#   "test"          — single CRN to verify cookies work
#   "scrape"        — one subject (e.g. ECE) for a given term
#   "scrape_all"    — every subject for a given term (slow, be patient)
#
MODE = "scrape"
TERM = TERMS["fall_2026"]   # change to summer_2026 / winter_2027 as needed
SUBJECT = "ECE"             # only used in "scrape" mode

if __name__ == "__main__":
    if MODE == "test":
        asyncio.run(test_single(crn="11271", term=TERM))

    elif MODE == "scrape":
        results = asyncio.run(scrape_subject(SUBJECT, TERM))
        print(f"\nScraped {len(results)} sections for {SUBJECT}")
        if results:
            print("\nFirst result:")
            print(json.dumps(results[0], indent=2, default=str))

    elif MODE == "scrape_all":
        results = asyncio.run(scrape_all_subjects(TERM))
        print(f"\nTotal sections scraped: {len(results)}")
        if results:
            print("\nFirst result:")
            print(json.dumps(results[0], indent=2, default=str))