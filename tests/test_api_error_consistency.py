import httpx
import pytest
from unittest.mock import AsyncMock, patch

from backend.utils.errors import AURORA_ERRORS


@pytest.mark.parametrize("error_cls", [httpx.RequestError, httpx.HTTPStatusError])
@pytest.mark.asyncio
async def test_terms_returns_503_on_aurora_failure(client, error_cls):
    if error_cls is httpx.RequestError:
        exc = httpx.RequestError("connection refused", request=httpx.Request("GET", "http://aurora"))
    else:
        request = httpx.Request("GET", "http://aurora")
        exc = httpx.HTTPStatusError("server error", request=request, response=httpx.Response(500, request=request))

    with patch("backend.routers.terms.fetch_terms", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.side_effect = exc
        response = await client.get("/api/terms", params={"offset": 1, "max": 10})

    assert response.status_code == 503
    body = response.json()
    assert "Aurora is unreachable" in body["detail"]
    assert body.get("success") is not True
    assert body.get("data", {}).get("items") != []


@pytest.mark.asyncio
async def test_terms_success_returns_live_items(client):
    page = [{"termCode": "202690", "description": "Fall 2026"}]
    with patch("backend.routers.terms.fetch_terms", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = page
        response = await client.get("/api/terms", params={"offset": 1, "max": 10})

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["source"] == "live"
    assert body["data"]["items"] == [{"code": "202690", "description": "Fall 2026"}]


@pytest.mark.asyncio
async def test_terms_regression_does_not_mask_failure_as_empty_success(client):
    with patch("backend.routers.terms.fetch_terms", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.side_effect = httpx.TimeoutException("timed out", request=httpx.Request("GET", "http://aurora"))
        response = await client.get("/api/terms")

    assert response.status_code == 503
    assert response.json()["detail"].startswith("Aurora is unreachable")


@pytest.mark.parametrize("error_cls", [httpx.RequestError, httpx.HTTPStatusError])
@pytest.mark.asyncio
async def test_subjects_returns_503_on_aurora_failure(client, error_cls):
    if error_cls is httpx.RequestError:
        exc = httpx.ConnectError("refused", request=httpx.Request("GET", "http://aurora"))
    else:
        request = httpx.Request("GET", "http://aurora")
        exc = httpx.HTTPStatusError("bad gateway", request=request, response=httpx.Response(502, request=request))

    with (
        patch("backend.routers.subjects.init_term_session", new_callable=AsyncMock),
        patch("backend.routers.subjects.fetch_subjects", new_callable=AsyncMock) as mock_fetch,
    ):
        mock_fetch.side_effect = exc
        response = await client.get("/api/subjects", params={"term": "202690"})

    assert response.status_code == 503


@pytest.mark.asyncio
async def test_courses_returns_503_on_aurora_failure(client):
    with patch("backend.routers.courses.scrape_subject_cached", new_callable=AsyncMock) as mock_scrape:
        mock_scrape.side_effect = httpx.ReadTimeout("slow", request=httpx.Request("GET", "http://aurora"))
        response = await client.get("/api/courses", params={"subject": "COMP", "term": "202690"})

    assert response.status_code == 503


def test_aurora_errors_tuple_covers_transport_failures():
    assert issubclass(httpx.ConnectError, AURORA_ERRORS)
    assert issubclass(httpx.HTTPStatusError, AURORA_ERRORS)
