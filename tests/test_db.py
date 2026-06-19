"""Tests for SQLite persistence layer (backend/db.py)."""
import time

import pytest

from backend.db import (
    _read_subjects,
    _read_terms,
    _upsert_subjects,
    _upsert_terms,
    init_db,
)


@pytest.fixture(autouse=True)
def ensure_schema():
    # conftest already sets DB_PATH to a temp file and calls init_db(),
    # but we call it again here in case order matters.
    init_db()


# ── Terms ─────────────────────────────────────────────────────────────────────

def test_read_terms_empty():
    items, fetched_at = _read_terms()
    assert items == []
    assert fetched_at is None


def test_upsert_and_read_terms():
    now = int(time.time())
    data = [
        {"code": "202690", "description": "Fall 2026"},
        {"code": "202710", "description": "Winter 2027"},
    ]
    _upsert_terms(data, now)

    items, fetched_at = _read_terms()
    codes = {t["code"] for t in items}
    assert codes == {"202690", "202710"}
    assert fetched_at == now


def test_upsert_terms_overwrites_existing():
    now = int(time.time())
    _upsert_terms([{"code": "202690", "description": "Old"}], now)
    _upsert_terms([{"code": "202690", "description": "Fall 2026"}], now + 1)

    items, _ = _read_terms()
    assert len(items) == 1
    assert items[0]["description"] == "Fall 2026"


# ── Subjects ──────────────────────────────────────────────────────────────────

def test_read_subjects_empty():
    items, fetched_at = _read_subjects("202690")
    assert items == []
    assert fetched_at is None


def test_upsert_and_read_subjects():
    now = int(time.time())
    data = [
        {"code": "COMP", "description": "Computer Science"},
        {"code": "ECE", "description": "Electrical & Computer Engineering"},
    ]
    _upsert_subjects("202690", data, now)

    items, fetched_at = _read_subjects("202690")
    codes = {s["code"] for s in items}
    assert codes == {"COMP", "ECE"}
    assert fetched_at == now


def test_subjects_are_isolated_per_term():
    now = int(time.time())
    _upsert_subjects("202690", [{"code": "COMP", "description": "Computer Science"}], now)
    _upsert_subjects("202710", [{"code": "MATH", "description": "Mathematics"}], now)

    fall_items, _ = _read_subjects("202690")
    winter_items, _ = _read_subjects("202710")
    assert [s["code"] for s in fall_items] == ["COMP"]
    assert [s["code"] for s in winter_items] == ["MATH"]


def test_upsert_subjects_replaces_previous_data():
    now = int(time.time())
    _upsert_subjects("202690", [{"code": "OLD", "description": "Old Subject"}], now)
    _upsert_subjects("202690", [{"code": "COMP", "description": "Computer Science"}], now + 1)

    items, _ = _read_subjects("202690")
    assert len(items) == 1
    assert items[0]["code"] == "COMP"
