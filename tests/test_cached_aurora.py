import httpx
import pytest

from backend.core.cache import cache
from backend.services.cached_aurora import cached_aurora_fetch


@pytest.mark.asyncio
async def test_cached_aurora_returns_stale_when_upstream_fails():
    cache._data["demo-key"] = (0.0, [{"code": "cached"}], None)

    async def failing_fetcher():
        raise httpx.ConnectError("aurora down")

    result = await cached_aurora_fetch("demo-key", failing_fetcher)

    assert result["source"] == "stale"
    assert result["data"] == [{"code": "cached"}]

    cache._data.pop("demo-key", None)


@pytest.mark.asyncio
async def test_cached_aurora_raises_when_no_cache_and_upstream_fails():
    async def failing_fetcher():
        raise httpx.ConnectError("aurora down")

    with pytest.raises(httpx.ConnectError):
        await cached_aurora_fetch("missing-key", failing_fetcher)
