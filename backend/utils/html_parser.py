import re

from bs4 import BeautifulSoup

COURSE_DESCRIPTION_SELECTOR = {"aria-labelledby": "courseDescription"}


def parse_description_html(html: str) -> dict:
    """
    Parse Aurora's courseDescription HTML fragment.

    Returns:
      {
        "description": str,
        "prerequisites_raw": str|None,
        "corequisites_raw": str|None
      }
    """

    soup = BeautifulSoup(html, "html.parser")
    section = soup.find("section", COURSE_DESCRIPTION_SELECTOR)
    if not section:
        return {"description": "", "prerequisites_raw": None, "corequisites_raw": None}

    text = section.get_text(separator=" ", strip=True)

    # Example patterns (Aurora sometimes varies pluralization):
    #   "... Prerequisite: ENG 1450. Pre- or corequisite: MATH 2132 ..."
    #   "... Prerequisites: ENG 1450. Pre- or corequisites: ..."
    prereq_marker = re.compile(r"Prerequisites?\s*:", flags=re.IGNORECASE)
    coreq_marker = re.compile(
        r"Pre-\s*or\s*corequisites?\s*:", flags=re.IGNORECASE
    )

    parts = prereq_marker.split(text, maxsplit=1)
    description = parts[0].strip().rstrip(".") if parts and parts[0] else ""
    prereq_and_more = parts[1].strip() if len(parts) > 1 else ""

    if not prereq_and_more:
        return {"description": description, "prerequisites_raw": None, "corequisites_raw": None}

    core_split = coreq_marker.split(prereq_and_more, maxsplit=1)
    prereq_raw = core_split[0].strip().rstrip(".") if core_split and core_split[0] else None
    coreq_raw = core_split[1].strip().rstrip(".") if len(core_split) > 1 else None

    return {
        "description": description,
        "prerequisites_raw": prereq_raw,
        "corequisites_raw": coreq_raw,
    }

