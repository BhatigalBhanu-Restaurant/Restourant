from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any, Optional, List
from ..services.order_service import OrderService
from ..middleware.auth import get_current_user
from ..utils.response import ApiResponse

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.get("")
async def get_orders(
    status: Optional[str] = None,
    orderType: Optional[str] = None,
    tableId: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if orderType:
        query["orderType"] = orderType
    if tableId:
        query["tableId"] = tableId
    
    orders = await OrderService.get_orders(query)
    return ApiResponse.success(data=orders)

@router.post("")
async def create_order(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    result = await OrderService.create_order(
        data=body,
        user_id=current_user["userId"],
        username=current_user["username"]
    )
    return ApiResponse.success(data=result.get("order"), message="Order created successfully")

@router.get("/{order_id}")
async def get_order(order_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    order = await OrderService.get_order_by_id(order_id)
    return ApiResponse.success(data=order)

@router.post("/{order_id}/items")
async def add_items(order_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    items = body.get("items", [])
    if isinstance(body, list):
        items = body
    result = await OrderService.add_items_to_order(
        order_id=order_id,
        new_items=items,
        user_id=current_user["userId"],
        username=current_user["username"]
    )
    return ApiResponse.success(data=result, message="Items added to order")

@router.patch("/{order_id}/status")
async def update_order_status(order_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    status = body.get("status")
    if status == "SERVED":
        res = await OrderService.mark_served(order_id, current_user["userId"], current_user["username"])
    elif status == "CANCELLED":
        res = await OrderService.cancel_order(order_id, body.get("reason"), current_user["userId"], current_user["username"])
    elif status == "COMPLETED":
        res = await OrderService.complete_order(order_id, current_user["userId"], current_user["username"])
    else:
        # direct status update fallback
        from ..database import get_db
        from datetime import datetime, timezone
        from ..sockets import SocketEvents
        db = get_db()
        db.orders.update_one({"id": order_id}, {"$set": {"status": status, "updatedAt": datetime.now(timezone.utc)}})
        res = db.orders.find_one({"id": order_id}, {"_id": 0})
        await SocketEvents.emit_order_updated(res)
    return ApiResponse.success(data=res, message=f"Order status updated to {status}")

@router.post("/{order_id}/served")
async def mark_order_served(order_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    res = await OrderService.mark_served(order_id, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=res, message="Order marked as served")

@router.post("/{order_id}/cancel")
async def cancel_order(order_id: str, body: Optional[Dict[str, Any]] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    reason = (body or {}).get("reason")
    res = await OrderService.cancel_order(order_id, reason, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=res, message="Order cancelled")

@router.post("/{order_id}/complete")
async def complete_order(order_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    res = await OrderService.complete_order(order_id, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=res, message="Order finalized successfully")
