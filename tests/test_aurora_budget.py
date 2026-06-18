from backend.services.aurora_budget import AuroraBudget


def test_budget_allows_requests_under_cap(monkeypatch):
    monkeypatch.setattr("backend.services.aurora_budget.AURORA_DAILY_BUDGET", 5)
    budget = AuroraBudget()
    for _ in range(5):
        budget.assert_can_request()
        budget.record_request()
    assert budget.used() == 5


def test_budget_gate_disabled(monkeypatch):
    # Budget cap is intentionally disabled; assert_can_request must never raise.
    monkeypatch.setattr("backend.services.aurora_budget.AURORA_DAILY_BUDGET", 2)
    budget = AuroraBudget()
    budget.record_request()
    budget.record_request()
    budget.assert_can_request()  # should not raise even though count >= budget


def test_budget_allows_requests_during_quiet_hours(monkeypatch):
    from datetime import datetime

    monkeypatch.setattr(
        "backend.services.aurora_budget.datetime",
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
    budget = AuroraBudget()
    budget.assert_can_request()


def test_quiet_hours_use_longer_cache_ttl(monkeypatch):
    from datetime import datetime

    monkeypatch.setattr(
        "backend.config.datetime",
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
    from backend.config import cache_ttl_seconds

    assert cache_ttl_seconds() == 1800


def test_daytime_cache_ttl_is_ten_minutes(monkeypatch):
    from datetime import datetime

    monkeypatch.setattr(
        "backend.config.datetime",
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
    from backend.config import cache_ttl_seconds

    assert cache_ttl_seconds() == 600


def test_default_daily_budget_is_1300(monkeypatch):
    monkeypatch.delenv("AURORA_DAILY_BUDGET", raising=False)
    import importlib

    import backend.config as config

    importlib.reload(config)
    assert config.AURORA_DAILY_BUDGET == 1300
