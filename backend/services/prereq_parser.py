import re

COURSE_CODE_RE = re.compile(r"\b([A-Z]{2,4})\s*(\d{4})\b")


def _extract_course_codes(text: str) -> list[str]:
    codes: list[str] = []
    for m in COURSE_CODE_RE.finditer(text or ""):
        subj = m.group(1)
        num = m.group(2)
        codes.append(f"{subj}{num}")
    # Deduplicate while preserving order
    seen = set()
    uniq: list[str] = []
    for c in codes:
        if c not in seen:
            seen.add(c)
            uniq.append(c)
    return uniq


def parse_prereq(raw: str) -> dict:
    """
    Parse Aurora's raw prerequisite string into course-code lists.

    Example input:
        "ENG 1450. Pre- or corequisite: MATH 2132 or [MATH 2100 and MATH 2110]"

    Example output:
        {
        "prerequisites_raw": "ENG 1450",
        "corequisites_raw": "MATH 2132 or [MATH 2100 and MATH 2110]",
        "prerequisites": ["ENG1450"],
        "corequisites": ["MATH2132", "MATH2100", "MATH2110"],
        "note": None
        }
    """

    raw = (raw or "").strip()
    if not raw:
        return {
            "prerequisites_raw": None,
            "corequisites_raw": None,
            "prerequisites": [],
            "corequisites": [],
            "note": None,
        }

    # Split into two parts if we can find the pre/corequisite marker.
    # Keep the bracket meaning in *_raw; we only strip when extracting codes.
    precore_split = re.split(
        r"Pre-\s*or\s*corequisites?\s*:\s*",
        raw,
        maxsplit=1,
        flags=re.IGNORECASE,
    )

    prerequisites_raw = precore_split[0].strip().rstrip(".") if precore_split[0] else None
    corequisites_raw = (
        precore_split[1].strip().rstrip(".") if len(precore_split) > 1 and precore_split[1] else None
    )

    # Extract codes from both sides, stripping UManitoba concurrent notation brackets.
    # Requirement: strip the "[" bracket when extracting course codes but preserve
    # meaning in the raw fields.
    prereq_codes = _extract_course_codes(
        (prerequisites_raw or "").replace("[", "").replace("]", "")
    )
    coreq_codes = _extract_course_codes(
        (corequisites_raw or "").replace("[", "").replace("]", "")
    )

    return {
        "prerequisites_raw": prerequisites_raw,
        "corequisites_raw": corequisites_raw,
        "prerequisites": prereq_codes,
        "corequisites": coreq_codes,
        "note": None,
    }

