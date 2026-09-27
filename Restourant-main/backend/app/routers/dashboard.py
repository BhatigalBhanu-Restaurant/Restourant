from fastapi import APIRouter, Depends
from typing import Dict, Any
from ..services.dashboard_service import DashboardService
from ..middleware.auth import get_current_user
from ..utils.response import ApiResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/metrics")
async def get_metrics(current_user: Dict[str, Any] = Depends(get_current_user)):
    perms = current_user.get("effectivePermissions")
    metrics = await DashboardService.get_dashboard_metrics(perms)
    return ApiResponse.success(data=metrics)
