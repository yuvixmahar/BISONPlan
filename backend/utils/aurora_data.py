def json_list(payload) -> list:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and isinstance(payload.get("data"), list):
        return payload["data"]
    return []


def normalize_subject_items(page: list) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for item in page:
        if not isinstance(item, dict):
            continue
        code = item.get("code")
        if not code:
            continue
        description = item.get("description") or code
        normalized.append({"code": str(code), "description": str(description)})
    return normalized


def normalize_term_items(page: list) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for item in page or []:
        if not isinstance(item, dict):
            continue

        term_code = item.get("termCode") or item.get("code") or item.get("term")
        label = item.get("description") or item.get("name") or item.get("label")
        if not term_code:
            continue

        normalized.append(
            {
                "code": str(term_code),
                "description": str(label or term_code),
            }
        )
    return normalized
