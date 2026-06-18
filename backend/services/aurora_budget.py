from datetime import datetime

from ..config import (
    AURORA_DAILY_BUDGET,
    AURORA_SNOOZE_END_HOUR,
    AURORA_SNOOZE_START_HOUR,
    AURORA_TIMEZONE,
)


class AuroraBudgetBlocked(Exception):
    def __init__(self, message: str, reason: str):
        super().__init__(message)
        self.message = message
        self.reason = reason


class AuroraBudget:
    """In-process daily Aurora HTTP budget with overnight snooze (CST)."""

    def __init__(self) -> None:
        self._count = 0
        self._day: datetime.date | None = None

    def _reset_if_new_day(self) -> None:
        today = datetime.now(AURORA_TIMEZONE).date()
        if self._day != today:
            self._day = today
            self._count = 0

    def is_snoozed(self) -> bool:
        hour = datetime.now(AURORA_TIMEZONE).hour
        if AURORA_SNOOZE_START_HOUR == AURORA_SNOOZE_END_HOUR:
            return False
        if AURORA_SNOOZE_START_HOUR < AURORA_SNOOZE_END_HOUR:
            return AURORA_SNOOZE_START_HOUR <= hour < AURORA_SNOOZE_END_HOUR
        return hour >= AURORA_SNOOZE_START_HOUR or hour < AURORA_SNOOZE_END_HOUR

    def used(self) -> int:
        self._reset_if_new_day()
        return self._count

    def remaining(self) -> int:
        self._reset_if_new_day()
        return max(0, AURORA_DAILY_BUDGET - self._count)

    def assert_can_request(self) -> None:
        self._reset_if_new_day()
        if self.is_snoozed():
            raise AuroraBudgetBlocked(
                "Aurora requests are paused overnight (11 PM–7 AM CST). Showing cached data when available.",
                "snooze",
            )
        if self._count >= AURORA_DAILY_BUDGET:
            raise AuroraBudgetBlocked(
                f"Daily Aurora request budget ({AURORA_DAILY_BUDGET}) reached. Cached data only until midnight CST.",
                "daily_cap",
            )

    def record_request(self) -> None:
        self._reset_if_new_day()
        self._count += 1

    def snapshot(self) -> dict:
        self._reset_if_new_day()
        return {
            "daily_budget": AURORA_DAILY_BUDGET,
            "used_today": self._count,
            "remaining_today": self.remaining(),
            "snoozed": self.is_snoozed(),
        }


aurora_budget = AuroraBudget()
