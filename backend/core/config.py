import os
from datetime import datetime
from zoneinfo import ZoneInfo

BASE_URL = "https://aurora-registration.umanitoba.ca/StudentRegistrationSsb/ssb"

CONTACT_EMAIL = os.getenv("BISONPLAN_CONTACT_EMAIL")
AURORA_USER_AGENT = (
    f"BISONplan-StudentProject/0.1 (+https://github.com; contact: {CONTACT_EMAIL})"
)

AURORA_TIMEZONE = ZoneInfo(os.getenv("AURORA_TIMEZONE", "America/Winnipeg"))

# 12 AM – 6 AM CST: longer cache, Aurora calls still allowed
AURORA_QUIET_START_HOUR = int(os.getenv("AURORA_QUIET_START_HOUR", "0"))
AURORA_QUIET_END_HOUR = int(os.getenv("AURORA_QUIET_END_HOUR", "6"))
AURORA_QUIET_CACHE_TTL_SECONDS = int(os.getenv("AURORA_QUIET_CACHE_TTL_SECONDS", "1800"))

REGISTRATION_MODE = os.getenv("REGISTRATION_MODE", "normal").lower()
_CACHE_TTL_BY_MODE = {"peak": 300, "normal": 600, "quiet": 3600}


def is_quiet_hours() -> bool:
    hour = datetime.now(AURORA_TIMEZONE).hour
    if AURORA_QUIET_START_HOUR < AURORA_QUIET_END_HOUR:
        return AURORA_QUIET_START_HOUR <= hour < AURORA_QUIET_END_HOUR
    return hour >= AURORA_QUIET_START_HOUR or hour < AURORA_QUIET_END_HOUR


def cache_ttl_seconds() -> int:
    override = os.getenv("CACHE_TTL_SECONDS")
    if override is not None:
        return int(override)
    if is_quiet_hours():
        return AURORA_QUIET_CACHE_TTL_SECONDS
    return _CACHE_TTL_BY_MODE.get(REGISTRATION_MODE, 600)


TERMS = {
    "summer_2026": "202650",
    "fall_2026": "202690",
    "winter_2027": "202710",
}


def cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or ["http://localhost:5173"]


def aurora_cookies() -> dict[str, str]:
    """Aurora Banner SSB endpoints work without pre-configured session cookies."""

    return {}


def aurora_headers() -> dict[str, str]:
    return {
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": "https://aurora-registration.umanitoba.ca/StudentRegistrationSsb/ssb/classSearch",
        "User-Agent": AURORA_USER_AGENT,
    }


HEADERS = aurora_headers()
