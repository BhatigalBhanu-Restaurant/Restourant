from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any, Optional
from ..services.billing_service import BillingService
from ..middleware.auth import get_current_user
from ..utils.response import ApiResponse

router = APIRouter(prefix="/billing", tags=["Billing"])

@router.get("")
async def get_bills(
    status: Optional[str] = None,
    orderId: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if orderId:
        query["orderId"] = orderId
    
    bills = await BillingService.get_bills(query)
    return ApiResponse.success(data=bills)

@router.get("/{bill_id}")
async def get_bill_by_id(bill_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    bill = await BillingService.get_bill_by_id(bill_id)
    return ApiResponse.success(data=bill)

@router.post("/generate")
async def generate_bill(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    order_id = body.get("orderId")
    if not order_id:
        raise HTTPException(status_code=400, detail={"success": False, "message": "orderId is required."})
    
    bill = await BillingService.generate_bill_from_order(
        order_id=order_id,
        options=body,
        user_id=current_user["userId"],
        username=current_user["username"]
    )
    return ApiResponse.success(data=bill, message="Bill generated successfully")

@router.post("/{bill_id}/split")
async def split_bill(bill_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    count = int(body.get("splitCount", 2))
    sub_bills = await BillingService.split_bill(bill_id, count)
    return ApiResponse.success(data=sub_bills, message=f"Bill split into {count} portions")
