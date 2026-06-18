def api_response(
    success: bool,
    source: str,
    cached_at: int | None,
    data,
    budget_message: str | None = None,
    cache_ttl_seconds: int | None = None,
) -> dict:
    payload = {
        "success": success,
        "source": source,
        "cached_at": cached_at,
        "data": data,
    }
    if budget_message:
        payload["budget_message"] = budget_message
    if cache_ttl_seconds is not None:
        payload["cache_ttl_seconds"] = cache_ttl_seconds
    return payload
