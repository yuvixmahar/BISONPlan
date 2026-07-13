import time
from typing import Any

from backend.core.config import cache_ttl_seconds


class TTLCache:
    """
    Minimal in-memory TTL cache.

    Stores entries as:
      key -> (timestamp, data, ttl_override_or_None)
    """

    def __init__(self) -> None:
        self._data: dict[str, tuple[float, Any, int | None]] = {}

    def set(self, key: str, data: Any, ttl: int | None = None) -> None:
        self._data[key] = (time.time(), data, ttl)

    def get(self, key: str) -> tuple[float, Any] | None:
        entry = self._data.get(key)
        if entry is None:
            return None
        ts, data, _ = entry
        return ts, data

    def _effective_ttl(self, key: str) -> int:
        entry = self._data.get(key)
        if entry is None:
            return cache_ttl_seconds()
        _, _, ttl_override = entry
        return ttl_override if ttl_override is not None else cache_ttl_seconds()

    def is_fresh(self, key: str) -> bool:
        entry = self._data.get(key)
        if not entry:
            return False
        ts, _, _ = entry
        return time.time() - ts < self._effective_ttl(key)


# Module-level cache instance used by services
cache = TTLCache()

# 24-hour TTL for data that barely changes (terms list, subjects per term)
DAILY_TTL_SECONDS = 86_400
