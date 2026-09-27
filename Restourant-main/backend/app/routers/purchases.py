from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any, Optional, List
from ..services.purchase_service import PurchaseService
from ..middleware.auth import get_current_user
from ..utils.response import ApiResponse

router = APIRouter(prefix="/purchases", tags=["Purchases"])

@router.get("/orders")
async def get_orders(status: Optional[str] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    query = {"status": status} if status else None
    orders = await PurchaseService.get_purchase_orders(query)
    return ApiResponse.success(data=orders)

@router.post("/orders")
async def create_order(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    order = await PurchaseService.create_purchase_order(
        data=body,
        user_id=current_user["userId"],
        username=current_user["username"]
    )
    return ApiResponse.success(data=order, message="Purchase order created successfully")

@router.patch("/orders/{order_id}/approve")
async def approve_order(order_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    order = await PurchaseService.approve_purchase_order(
        po_id=order_id,
        user_id=current_user["userId"],
        username=current_user["username"]
    )
    return ApiResponse.success(data=order, message="Purchase order approved")

@router.post("/orders/{order_id}/receive")
async def receive_order(order_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    grn = body.get("grnNumber") or f"GRN-{order_id[:6]}"
    items = body.get("items", [])
    order = await PurchaseService.receive_goods(
        po_id=order_id,
        grn_number=grn,
        received_items=items,
        user_id=current_user["userId"],
        username=current_user["username"]
    )
    return ApiResponse.success(data=order, message="Goods received and inventory updated")
