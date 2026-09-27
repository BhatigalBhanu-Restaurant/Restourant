from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any, Optional
from ..services.payment_service import PaymentService
from ..middleware.auth import get_current_user
from ..utils.response import ApiResponse

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.get("")
async def get_payments(
    paymentMethod: Optional[str] = None,
    status: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    query = {}
    if paymentMethod:
        query["paymentMethod"] = paymentMethod
    if status:
        query["status"] = status
    
    payments = await PaymentService.get_payments(query)
    return ApiResponse.success(data=payments)

@router.post("")
async def create_payment(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    payment = await PaymentService.create_payment(
        data=body,
        user_id=current_user["userId"],
        username=current_user["username"]
    )
    return ApiResponse.success(data=payment, message="Payment recorded successfully")

@router.get("/{payment_id}")
async def get_payment_by_id(payment_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    payment = await PaymentService.get_payment_by_id(payment_id)
    return ApiResponse.success(data=payment)
