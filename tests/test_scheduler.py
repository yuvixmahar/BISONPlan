"""Tests for the APScheduler refresh job (backend/services/scheduler.py)."""
from unittest.mock import AsyncMock, patch

import pytest

from backend.db import _read_subjects, _read_terms, init_db
from backend.services.scheduler import refresh_priority_data


@pytest.fixture(autouse=True)
def ensure_schema():
    init_db()


@pytest.mark.asyncio
async def test_refresh_persists_terms_to_db():
    raw_terms = [{"termCode": "202690", "description": "Fall 2026"}]

    with (
        patch("backend.services.scheduler.fetch_all_terms", new_callable=AsyncMock) as mock_terms,
        patch("backend.services.scheduler.fetch_all_subjects", new_callable=AsyncMock) as mock_subjects,
        patch("backend.services.scheduler.init_term_session", new_callable=AsyncMock),
    ):
        mock_terms.return_value = raw_terms
        mock_subjects.return_value = []
        await refresh_priority_data()

    items, fetched_at = _read_terms()
    assert any(t["code"] == "202690" for t in items)
    assert fetched_at is not None


@pytest.mark.asyncio
async def test_refresh_persists_subjects_for_priority_terms():
    raw_subjects = [
        {"code": "COMP", "description": "Computer Science"},
        {"code": "ECE", "description": "Electrical Engineering"},
    ]

    with (
        patch("backend.services.scheduler.fetch_all_terms", new_callable=AsyncMock) as mock_terms,
        patch("backend.services.scheduler.fetch_all_subjects", new_callable=AsyncMock) as mock_subjects,
        patch("backend.services.scheduler.init_term_session", new_callable=AsyncMock),
    ):
        mock_terms.return_value = []
        mock_subjects.return_value = raw_subjects
        await refresh_priority_data()

    # All three priority terms should have subjects written
    from backend.config import TERMS as PRIORITY_TERMS
    for term_code in PRIORITY_TERMS.values():
        items, _ = _read_subjects(term_code)
        assert len(items) == 2
        codes = {s["code"] for s in items}
        assert codes == {"COMP", "ECE"}


@pytest.mark.asyncio
async def test_refresh_continues_if_terms_fetch_fails():
    """A terms failure must not abort the subjects refresh."""
    import httpx

    raw_subjects = [{"code": "COMP", "description": "Computer Science"}]

    with (
        patch("backend.services.scheduler.fetch_all_terms", new_callable=AsyncMock) as mock_terms,
        patch("backend.services.scheduler.fetch_all_subjects", new_callable=AsyncMock) as mock_subjects,
        patch("backend.services.scheduler.init_term_session", new_callable=AsyncMock),
    ):
        mock_terms.side_effect = httpx.RequestError("timeout", request=httpx.Request("GET", "http://x"))
        mock_subjects.return_value = raw_subjects
        await refresh_priority_data()  # must not raise

    from backend.config import TERMS as PRIORITY_TERMS
    for term_code in PRIORITY_TERMS.values():
        items, _ = _read_subjects(term_code)
        assert len(items) == 1


@pytest.mark.asyncio
async def test_refresh_continues_if_one_subject_fetch_fails():
    """A failure for one term must not abort the remaining terms."""
    import httpx

    call_count = 0

    async def mock_subjects(client, term):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise httpx.RequestError("timeout", request=httpx.Request("GET", "http://x"))
        return [{"code": "COMP", "description": "Computer Science"}]

    with (
        patch("backend.services.scheduler.fetch_all_terms", new_callable=AsyncMock, return_value=[]),
        patch("backend.services.scheduler.fetch_all_subjects", side_effect=mock_subjects),
        patch("backend.services.scheduler.init_term_session", new_callable=AsyncMock),
    ):
        await refresh_priority_data()  # must not raise

    from backend.config import TERMS as PRIORITY_TERMS
    written = sum(
        1 for code in PRIORITY_TERMS.values()
        if _read_subjects(code)[0]
    )
    # first term failed, remaining two succeeded
    assert written == len(PRIORITY_TERMS) - 1
