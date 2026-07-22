from fastapi import APIRouter

from backend.core.config import cache_ttl_seconds, is_quiet_hours
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
            "quiet_hours": is_quiet_hours(),
            "cache_ttl_seconds": cache_ttl_seconds(),
        },
    )
