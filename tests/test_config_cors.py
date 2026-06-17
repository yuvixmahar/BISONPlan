import os

import pytest

from backend.config import cors_origins


def test_cors_origins_default_local_dev(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    assert cors_origins() == ["http://localhost:5173"]


def test_cors_origins_splits_and_strips_entries(monkeypatch):
    monkeypatch.setenv(
        "CORS_ORIGINS",
        " https://bisonplan.vercel.app ,https://www.bisonplan.vercel.app ",
    )
    assert cors_origins() == [
        "https://bisonplan.vercel.app",
        "https://www.bisonplan.vercel.app",
    ]


def test_cors_origins_ignores_empty_segments(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://a.com,, ,https://b.com")
    assert cors_origins() == ["https://a.com", "https://b.com"]


def test_cors_origins_empty_env_falls_back_to_localhost(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "   ")
    assert cors_origins() == ["http://localhost:5173"]


@pytest.mark.parametrize(
    "value",
    [
        "javascript:alert(1)",
        "https://evil.com\nhttps://trusted.com",
        "file:///etc/passwd",
    ],
)
def test_cors_origins_does_not_crash_on_unusual_values(monkeypatch, value):
    monkeypatch.setenv("CORS_ORIGINS", value)
    origins = cors_origins()
    assert isinstance(origins, list)
    assert all(isinstance(origin, str) for origin in origins)
