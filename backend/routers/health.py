import time
import httpx

from fastapi import APIRouter

from ..config import BASE_URL, HEADERS, aurora_cookies

router = APIRouter()


def _wrap(success: bool, source: str, cached_at: int | None, data):
    return {"success": success, "source": source, "cached_at": cached_at, "data": data}


@router.get("/health")
async def health():
    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(
            cookies=aurora_cookies(),
            headers=HEADERS,
            timeout=5,
        ) as client:
            r = await client.get(
                f"{BASE_URL}/classSearch/getTerms",
                params={"searchTerm": "", "offset": 1, "max": 1},
            )
            r.raise_for_status()

        latency_ms = int((time.perf_counter() - started) * 1000)
        return _wrap(True, "live", None, {"aurora_status": "up", "latency_ms": latency_ms})
    except Exception:
        latency_ms = int((time.perf_counter() - started) * 1000)
        return _wrap(True, "live", None, {"aurora_status": "down", "latency_ms": latency_ms})

