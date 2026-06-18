from fastapi import APIRouter

from ..services.aurora_budget import aurora_budget
from ..utils.api_response import api_response

router = APIRouter()


@router.get("/health")
async def health():
    return api_response(
        True,
        "live",
        None,
        {
            "api_status": "up",
            **aurora_budget.snapshot(),
        },
    )
