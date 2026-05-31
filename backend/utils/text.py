from html import unescape


def decode_html_entities(value: str) -> str:
    """Decode HTML entities from Aurora text fields (e.g. &amp; → &)."""
    if not value or "&" not in value:
        return value
    return unescape(value)


def decode_aurora_strings(value):
    """Recursively decode HTML entities in Aurora JSON payloads."""
    if isinstance(value, str):
        return decode_html_entities(value)
    if isinstance(value, list):
        return [decode_aurora_strings(item) for item in value]
    if isinstance(value, dict):
        return {key: decode_aurora_strings(item) for key, item in value.items()}
    return value
