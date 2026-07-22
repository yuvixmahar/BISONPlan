import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app


@pytest.mark.asyncio
async def test_health_reports_cache_ttl():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["api_status"] == "up"
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


def test_aurora_user_agent_identifies_project_and_contact(monkeypatch):
    """Aurora requests must be attributable: project name plus a contact address.

    The contact address comes from ``BISONPLAN_CONTACT_EMAIL`` and is read at
    import time, so the module is reloaded around the patched environment.
    """
    import importlib

    from backend.core import config

    monkeypatch.setenv("BISONPLAN_CONTACT_EMAIL", "contact@example.com")
    importlib.reload(config)
    try:
        user_agent = config.aurora_headers()["User-Agent"]
        assert "BISONplan-StudentProject" in user_agent
        assert "contact@example.com" in user_agent
    finally:
        monkeypatch.delenv("BISONPLAN_CONTACT_EMAIL", raising=False)
        importlib.reload(config)
