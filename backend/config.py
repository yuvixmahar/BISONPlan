import os

BASE_URL = "https://aurora-registration.umanitoba.ca/StudentRegistrationSsb/ssb"


def cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]

TERMS = {
    "summer_2026": "202650",
    "fall_2026": "202690",
    "winter_2027": "202710",
}

# Live data freshness window
CACHE_TTL_SECONDS = 60

# How long stale cache is acceptable as fallback
STALE_TTL_SECONDS = 3600


def aurora_cookies() -> dict[str, str]:
    """Aurora Banner SSB endpoints work without pre-configured session cookies."""

    return {}


HEADERS = {
    # Banner SSB expects form posts
    "Content-Type": "application/x-www-form-urlencoded",
    "Referer": "https://aurora-registration.umanitoba.ca/StudentRegistrationSsb/ssb/classSearch",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}
