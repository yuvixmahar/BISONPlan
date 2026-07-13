import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app


@pytest.mark.asyncio
async def test_health_reports_budget_and_cache_ttl():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["api_status"] == "up"
    assert body["data"]["daily_budget"] == 1300
    assert body["data"]["cache_ttl_seconds"] >= 300


@pytest.mark.asyncio
async def test_invalid_term_code_returns_422():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/subjects", params={"term": "abc"})

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_invalid_subject_code_returns_422():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/api/courses",
            params={"subject": "!!!", "term": "202690"},
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_aurora_user_agent_contains_contact_email():
    from backend.core.config import aurora_headers

    headers = aurora_headers()
    assert "singhy5@myumanitoba.ca" in headers["User-Agent"]
    assert "BISONplan-StudentProject" in headers["User-Agent"]
