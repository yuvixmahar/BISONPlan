from fastapi import APIRouter

from ..config import cache_ttl_seconds
from ..services.aurora_budget import aurora_budget
from ..utils.api_response import api_response

router = APIRouter()


@router.get("/health")
async def health():
    budget = aurora_budget.snapshot()
    return api_response(
        True,
        "live",
        None,
        {
            "api_status": "up",
            "cache_ttl_seconds": cache_ttl_seconds(),
            **budget,
        },
    )
