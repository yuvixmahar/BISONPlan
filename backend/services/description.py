from ..services.prereq_parser import parse_prereq
from ..utils.text import decode_aurora_strings


def build_combined_prereq_raw(
    prerequisites_raw: str | None,
    corequisites_raw: str | None,
) -> str | None:
    if prerequisites_raw and corequisites_raw:
        return f"{prerequisites_raw}. Pre- or corequisite: {corequisites_raw}"
    if prerequisites_raw:
        return prerequisites_raw
    if corequisites_raw:
        return f"Pre- or corequisite: {corequisites_raw}"
    return None


def build_course_detail(parsed_desc: dict) -> dict:
    prerequisites_raw = parsed_desc.get("prerequisites_raw")
    corequisites_raw = parsed_desc.get("corequisites_raw")
    combined_raw = build_combined_prereq_raw(prerequisites_raw, corequisites_raw)
    parsed = parse_prereq(combined_raw or "")

    return decode_aurora_strings(
        {
            "description": parsed_desc.get("description") or "",
            "prerequisites_raw": prerequisites_raw,
            "corequisites_raw": corequisites_raw,
            "prerequisites": parsed.get("prerequisites") or [],
            "corequisites": parsed.get("corequisites") or [],
            "note": parsed.get("note"),
        }
    )


def empty_course_detail() -> dict:
    return build_course_detail({})


def merge_course_with_description(course: dict, parsed_desc: dict) -> dict:
    return decode_aurora_strings({**course, **build_course_detail(parsed_desc)})
