import pytest


@pytest.mark.asyncio
async def test_health_returns_up_status(client):
    response = await client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["source"] == "live"
    assert body["data"]["api_status"] == "up"
    assert "quiet_hours" in body["data"]
    assert "cache_ttl_seconds" in body["data"]
