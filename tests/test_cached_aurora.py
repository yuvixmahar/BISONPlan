import pytest

from backend.cache import cache
from backend.services.aurora import AuroraBudgetBlocked
from backend.services.cached_aurora import cached_aurora_fetch


@pytest.mark.asyncio
async def test_cached_aurora_returns_cache_when_budget_blocked():
    cache._data["demo-key"] = (0.0, [{"code": "cached"}])

    async def blocked_fetcher():
        raise AuroraBudgetBlocked("budget reached", "daily_cap")

    result = await cached_aurora_fetch("demo-key", blocked_fetcher)

    assert result["source"] == "cached_only"
    assert result["data"] == [{"code": "cached"}]
    assert result["budget_blocked"] is True

    cache._data.pop("demo-key", None)
