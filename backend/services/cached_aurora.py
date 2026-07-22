import time
from collections.abc import Awaitable, Callable
from typing import Any

from backend.core.cache import cache
from backend.utils.errors import AURORA_ERRORS


async def cached_aurora_fetch(
    cache_key: str,
    fetcher: Callable[[], Awaitable[Any]],
) -> dict:
    """
    Shared cache wrapper for Aurora-backed endpoints.

    Returns:
      {
        "source": "live" | "stale",
        "cached_at": int | None,
        "data": Any,
      }

    On upstream failure, falls back to the last cached value ("stale") when one
    exists; otherwise the error propagates. This fallback is intentionally
    unbounded by age: if Aurora is down, serving old cached data to students is
    the whole point of BISONplan, so we never expire the fallback copy.
    """

    stale_entry = cache.get(cache_key)

    if stale_entry and cache.is_fresh(cache_key):
        cached_at, data = stale_entry
        return {
            "source": "live",
            "cached_at": int(cached_at),
            "data": data,
        }

    try:
        fresh_data = await fetcher()
        cache.set(cache_key, fresh_data)
        return {
            "source": "live",
            "cached_at": int(time.time()),
            "data": fresh_data,
        }
    except AURORA_ERRORS:
        if stale_entry:
            cached_at, stale_data = stale_entry
            return {
                "source": "stale",
                "cached_at": int(cached_at),
                "data": stale_data,
            }
        raise
