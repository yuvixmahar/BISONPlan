from fastapi import APIRouter

from backend.services.aurora_budget import aurora_budget
from backend.utils.api_response import ApiResponse

router = APIRouter()


@router.get("/health")
async def health() -> ApiResponse:
    return ApiResponse(
        success=True,
        source="live",
        cached_at=None,
        data={
            "api_status": "up",
            **aurora_budget.snapshot(),
        },
    )
