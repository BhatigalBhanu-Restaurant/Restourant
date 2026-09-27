from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any, Optional
from ..services.token_service import TokenService
from ..middleware.auth import get_current_user
from ..utils.response import ApiResponse

router = APIRouter(prefix="/tokens", tags=["Tokens & Queue"])

@router.get("/queue")
async def get_queue(status: Optional[str] = None, date: Optional[str] = None):
    # Public & authenticated token queue endpoint
    tokens = await TokenService.get_queue(status=status, date=date)
    return ApiResponse.success(data=tokens)

@router.get("/metrics")
async def get_metrics(date: Optional[str] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    metrics = await TokenService.get_token_metrics(date=date)
    return ApiResponse.success(data=metrics)

@router.post("")
async def create_token(body: Dict[str, Any]):
    # Allow token creation from reception or public kiosk
    token = await TokenService.generate_token(data=body)
    return ApiResponse.success(data=token, message="Token generated successfully")

@router.patch("/{token_id}/call")
async def call_token(token_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    token = await TokenService.call_token(token_id, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=token, message=f"Token {token.get('tokenCode')} called")

@router.patch("/{token_id}/recall")
async def recall_token(token_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    token = await TokenService.recall_token(token_id)
    return ApiResponse.success(data=token, message=f"Token {token.get('tokenCode')} recalled")

@router.patch("/{token_id}/seat")
async def seat_token(token_id: str, body: Optional[Dict[str, Any]] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    table_id = (body or {}).get("tableId")
    token = await TokenService.seat_token(token_id, table_id)
    return ApiResponse.success(data=token, message="Token seated")

@router.patch("/{token_id}/cancel")
async def cancel_token(token_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    token = await TokenService.cancel_token(token_id)
    return ApiResponse.success(data=token, message="Token cancelled")

@router.patch("/{token_id}/skip")
async def skip_token(token_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    token = await TokenService.skip_token(token_id)
    return ApiResponse.success(data=token, message="Token skipped")

@router.patch("/{token_id}/complete")
async def complete_token(token_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    token = await TokenService.complete_token(token_id)
    return ApiResponse.success(data=token, message="Token completed")
