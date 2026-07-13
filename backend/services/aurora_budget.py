from datetime import date, datetime

from ..config import (
    AURORA_DAILY_BUDGET,
    AURORA_TIMEZONE,
    cache_ttl_seconds,
    is_quiet_hours,
)


class AuroraBudget:
    """In-process daily Aurora HTTP budget."""

    def __init__(self) -> None:
        self._count = 0
        self._day: date | None = None

    def _reset_if_new_day(self) -> None:
        today = datetime.now(AURORA_TIMEZONE).date()
        if self._day != today:
            self._day = today
            self._count = 0

    def used(self) -> int:
        self._reset_if_new_day()
        return self._count

    def remaining(self) -> int:
        self._reset_if_new_day()
        return max(0, AURORA_DAILY_BUDGET - self._count)

    def record_request(self) -> None:
        self._reset_if_new_day()
        self._count += 1

    def snapshot(self) -> dict:
        self._reset_if_new_day()
        return {
            "daily_budget": AURORA_DAILY_BUDGET,
            "used_today": self._count,
            "remaining_today": self.remaining(),
            "quiet_hours": is_quiet_hours(),
            "cache_ttl_seconds": cache_ttl_seconds(),
        }


aurora_budget = AuroraBudget()
