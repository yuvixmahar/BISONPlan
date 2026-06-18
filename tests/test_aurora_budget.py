import pytest

from backend.services.aurora_budget import AuroraBudget, AuroraBudgetBlocked


def test_budget_allows_requests_under_cap(monkeypatch):
    monkeypatch.setattr("backend.services.aurora_budget.AURORA_DAILY_BUDGET", 5)
    budget = AuroraBudget()
    for _ in range(5):
        budget.assert_can_request()
        budget.record_request()
    assert budget.used() == 5


def test_budget_blocks_after_daily_cap(monkeypatch):
    monkeypatch.setattr("backend.services.aurora_budget.AURORA_DAILY_BUDGET", 2)
    budget = AuroraBudget()
    budget.record_request()
    budget.record_request()
    with pytest.raises(AuroraBudgetBlocked) as exc:
        budget.assert_can_request()
    assert exc.value.reason == "daily_cap"


def test_budget_snooze_blocks_overnight(monkeypatch):
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
    with pytest.raises(AuroraBudgetBlocked) as exc:
        budget.assert_can_request()
    assert exc.value.reason == "snooze"


def test_budget_allows_active_hours(monkeypatch):
    from datetime import datetime

    monkeypatch.setattr(
        "backend.services.aurora_budget.datetime",
        type(
            "DT",
            (),
            {
                "now": staticmethod(
                    lambda tz: datetime(2026, 6, 17, 12, 0, tzinfo=tz)
                )
            },
        ),
    )
    budget = AuroraBudget()
    budget.assert_can_request()


def test_default_daily_budget_is_1300(monkeypatch):
    monkeypatch.delenv("AURORA_DAILY_BUDGET", raising=False)
    import importlib

    import backend.config as config

    importlib.reload(config)
    assert config.AURORA_DAILY_BUDGET == 1300
