import time

from fastapi import APIRouter

from ..config import BASE_URL
from ..services.aurora import make_client
from ..utils.api_response import api_response

router = APIRouter()


@router.get("/health")
async def health():
    started = time.perf_counter()
    try:
        async with make_client(timeout=5) as client:
            r = await client.get(
                f"{BASE_URL}/classSearch/getTerms",
                params={"searchTerm": "", "offset": 1, "max": 1},
            )
            r.raise_for_status()

        latency_ms = int((time.perf_counter() - started) * 1000)
        return api_response(
            True, "live", None, {"aurora_status": "up", "latency_ms": latency_ms}
        )
    except Exception:
        latency_ms = int((time.perf_counter() - started) * 1000)
        return api_response(
            True, "live", None, {"aurora_status": "down", "latency_ms": latency_ms}
        )
