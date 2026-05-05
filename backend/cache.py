import time
from typing import Any

from .config import CACHE_TTL_SECONDS, STALE_TTL_SECONDS


class TTLCache:
    """
    Minimal in-memory TTL cache.

    Stores entries as:
      key -> (timestamp, data)
    """

    def __init__(self) -> None:
        self._data: dict[str, tuple[float, Any]] = {}

    def set(self, key: str, data: Any) -> None:
        self._data[key] = (time.time(), data)

    def get(self, key: str) -> tuple[float, Any] | None:
        return self._data.get(key)

    def is_fresh(self, key: str) -> bool:
        entry = self._data.get(key)
        if not entry:
            return False
        ts, _ = entry
        age = time.time() - ts
        return age < CACHE_TTL_SECONDS

    def is_stale(self, key: str) -> bool:
        entry = self._data.get(key)
        if not entry:
            return False
        ts, _ = entry
        age = time.time() - ts
        return CACHE_TTL_SECONDS <= age < STALE_TTL_SECONDS


# Module-level cache instance used by services
cache = TTLCache()

