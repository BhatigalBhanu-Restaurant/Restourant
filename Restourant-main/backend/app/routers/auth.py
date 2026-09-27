from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any
from ..services.auth_service import AuthService
from ..middleware.auth import get_current_user
from ..utils.response import ApiResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login")
async def login(request: Request, body: Dict[str, Any]):
    username = body.get("username") or body.get("email") or ""
    password = body.get("password") or ""
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    
    result = await AuthService.login(
        username_or_email=username,
        password=password,
        ip_address=ip,
        user_agent=ua
    )
    return ApiResponse.success(data=result, message="Login successful")

@router.post("/refresh")
async def refresh_token(body: Dict[str, Any]):
    token = body.get("refreshToken") or body.get("refresh_token") or ""
    if not token:
        raise HTTPException(status_code=400, detail={"success": False, "message": "Refresh token is required."})
    
    result = await AuthService.refresh_token(token)
    return ApiResponse.success(data=result, message="Token refreshed successfully")

@router.get("/profile")
async def get_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    user = await AuthService.get_profile(current_user["userId"])
    perm_map = current_user.get("permissionMap", {})
    effective_perms = [v for v in perm_map.values() if v.get("granted")]
    
    return ApiResponse.success(data={
        "user": user,
        "effectivePermissions": effective_perms
    })

@router.post("/change-password")
async def change_password(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    curr_pass = body.get("currentPassword") or body.get("oldPassword") or ""
    new_pass = body.get("newPassword") or ""
    
    result = await AuthService.change_password(
        user_id=current_user["userId"],
        current_pass=curr_pass,
        new_pass=new_pass
    )
    return ApiResponse.success(message="Password updated successfully")

@router.get("/verify")
async def verify(current_user: Dict[str, Any] = Depends(get_current_user)):
    return ApiResponse.success(data={"valid": True, "userId": current_user["userId"]})
