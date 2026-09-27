from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any, Optional
from ..services.kot_service import KOTService
from ..middleware.auth import get_current_user
from ..utils.response import ApiResponse

router = APIRouter(prefix="/kot", tags=["Kitchen Order Tickets"])

@router.get("")
async def get_kots(current_user: Dict[str, Any] = Depends(get_current_user)):
    kots = await KOTService.get_active_kots()
    return ApiResponse.success(data=kots)

@router.get("/{kot_id}")
async def get_kot_by_id(kot_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    from ..database import get_db
    db = get_db()
    kot = db.kot_tickets.find_one({"id": kot_id}, {"_id": 0})
    if not kot:
        raise HTTPException(status_code=404, detail={"success": False, "message": "KOT not found."})
    return ApiResponse.success(data=kot)

@router.patch("/{kot_id}/{action}")
async def handle_kot_action(
    kot_id: str,
    action: str,
    body: Optional[Dict[str, Any]] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    action_lower = action.lower()
    u_id = current_user["userId"]
    u_name = current_user["username"]

    if action_lower in ["accept", "accepted"]:
        res = await KOTService.accept_kot(kot_id, u_id, u_name)
    elif action_lower in ["prepare", "start", "preparing"]:
        res = await KOTService.start_preparing(kot_id, u_id, u_name)
    elif action_lower in ["ready"]:
        res = await KOTService.mark_ready(kot_id, u_id, u_name)
    elif action_lower in ["serve", "served"]:
        res = await KOTService.mark_served(kot_id, u_id, u_name)
    elif action_lower in ["priority"]:
        pri = (body or {}).get("priority", "HIGH")
        res = await KOTService.set_priority(kot_id, pri)
    elif action_lower in ["cancel"]:
        from ..database import get_db
        from datetime import datetime, timezone
        from ..sockets import SocketEvents
        db = get_db()
        db.kot_tickets.update_one({"id": kot_id}, {"$set": {"status": "CANCELLED", "updatedAt": datetime.now(timezone.utc)}})
        res = db.kot_tickets.find_one({"id": kot_id}, {"_id": 0})
        await SocketEvents.emit_kot_updated(res)
        await SocketEvents.emit_data_changed("kitchen")
    else:
        raise HTTPException(status_code=400, detail={"success": False, "message": f"Unknown action: {action}"})

    return ApiResponse.success(data=res, message=f"KOT {action} successfully")

@router.patch("/{kot_id}/status")
async def update_kot_status(
    kot_id: str,
    body: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    status = body.get("status", "").upper()
    return await handle_kot_action(kot_id, status.lower(), body, current_user)
