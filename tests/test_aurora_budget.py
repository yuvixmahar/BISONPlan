from backend.services.aurora_budget import AuroraBudget


def test_budget_counts_requests():
    budget = AuroraBudget()
    for _ in range(5):
        budget.record_request()
    assert budget.used() == 5


def test_quiet_hours_use_longer_cache_ttl(monkeypatch):
    from datetime import datetime

    monkeypatch.setattr(
        "backend.core.config.datetime",
        type(
            "DT",
            (),
            {
                "now": staticmethod(
                    lambda tz: datetime(2026, 6, 17, 2, 0, tzinfo=tz)
                )
            },
        ),
    )
    from backend.core.config import cache_ttl_seconds

    assert cache_ttl_seconds() == 1800


def test_daytime_cache_ttl_is_ten_minutes(monkeypatch):
    from datetime import datetime

    monkeypatch.setattr(
        "backend.core.config.datetime",
        type(
            "DT",
            (),
            {
                "now": staticmethod(
                    lambda tz: datetime(2026, 6, 17, 14, 0, tzinfo=tz)
                )
            },
        ),
    )
    from backend.core.config import cache_ttl_seconds

    assert cache_ttl_seconds() == 600


def test_default_daily_budget_is_1300(monkeypatch):
    monkeypatch.delenv("AURORA_DAILY_BUDGET", raising=False)
    import importlib

    import backend.core.config as config

    importlib.reload(config)
    assert config.AURORA_DAILY_BUDGET == 1300
