def api_response(
    success: bool,
    source: str,
    cached_at: int | None,
    data,
) -> dict:
    return {
        "success": success,
        "source": source,
        "cached_at": cached_at,
        "data": data,
    }
