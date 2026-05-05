import os
from dotenv import load_dotenv

# Load Aurora cookies / session values from .env
load_dotenv()

BASE_URL = "https://aurora-registration.umanitoba.ca/StudentRegistrationSsb/ssb"

TERMS = {
    "summer_2026": "202650",
    "fall_2026": "202690",
    "winter_2027": "202710",
}

# Live data freshness window
CACHE_TTL_SECONDS = 60

# How long stale cache is acceptable as fallback
STALE_TTL_SECONDS = 3600


# Cookie names used by Aurora Banner SSB
COOKIE_MAP = {
    "BIGipServer~INB_SSB_Flex~Banner_Self_Service_Registration_BANPROD_pool": os.getenv(
        "AURORA_BIGIP_COOKIE", ""
    ),
    "cf_clearance": os.getenv("AURORA_CF_CLEARANCE", ""),
    "JSESSIONID": os.getenv("AURORA_JSESSIONID", ""),
    # In the provided prototype, this cookie name is "TS01c6c21c"
    "TS01c6c21c": os.getenv("AURORA_TS_COOKIE", ""),
}


def aurora_cookies() -> dict[str, str]:
    """
    Return cookie dict for httpx AsyncClient.

    If any values are empty, Aurora will likely return empty results or errors;
    routers will surface that to the user.
    """

    return {k: v for k, v in COOKIE_MAP.items() if v}


HEADERS = {
    # Banner SSB expects form posts
    "Content-Type": "application/x-www-form-urlencoded",
    "Referer": "https://aurora-registration.umanitoba.ca/StudentRegistrationSsb/ssb/classSearch",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}

