import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any, Optional, List
from ..database import get_db
from ..services.system_service import SystemService
from ..middleware.auth import get_current_user
from ..utils.response import ApiResponse
from ..seeds import run_database_seeds

router = APIRouter(prefix="/system", tags=["System & Settings"])

# --- SETTINGS ---
@router.get("/settings")
async def get_settings():
    settings = await SystemService.get_settings()
    return ApiResponse.success(data=settings)

@router.get("/settings/detailed")
async def get_detailed_settings(current_user: Dict[str, Any] = Depends(get_current_user)):
    settings = await SystemService.get_all_detailed_settings()
    return ApiResponse.success(data=settings)

@router.post("/settings")
async def update_settings(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    settings_dict = body.get("settings", body)
    res = await SystemService.update_settings(settings_dict, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=res, message="Settings updated successfully")

@router.post("/settings/single")
async def save_single_setting(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    res = await SystemService.save_single_setting(body, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=res, message="Setting saved successfully")

@router.delete("/settings/{key}")
async def delete_setting(key: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    await SystemService.delete_setting(key, current_user["userId"], current_user["username"])
    return ApiResponse.success(message="Setting deleted successfully")

# --- NOTIFICATIONS ---
@router.get("/notifications")
async def get_notifications(current_user: Dict[str, Any] = Depends(get_current_user)):
    notifs = await SystemService.get_notifications(user_id=current_user["userId"], role_id=current_user["roleId"])
    return ApiResponse.success(data=notifs)

@router.post("/notifications")
async def create_notification(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    notif = await SystemService.create_notification(body)
    return ApiResponse.success(data=notif, message="Notification dispatched")

@router.patch("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    res = await SystemService.mark_notification_read(notif_id)
    return ApiResponse.success(data=res, message="Marked as read")

@router.patch("/notifications/read-all")
async def mark_all_notifications_read(current_user: Dict[str, Any] = Depends(get_current_user)):
    res = await SystemService.mark_all_notifications_read(current_user["userId"])
    return ApiResponse.success(data=res, message="All notifications marked as read")

# --- AUDIT LOGS ---
@router.get("/audit-logs")
async def get_audit_logs(
    module: Optional[str] = None,
    action: Optional[str] = None,
    username: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    query = {}
    if module:
        query["module"] = module
    if action:
        query["action"] = action
    if username:
        query["username"] = username
    logs = await SystemService.get_audit_logs(query)
    return ApiResponse.success(data=logs)

# --- SYSTEM CONTROL SWITCHBOARD ---
@router.get("/system-control/status")
async def get_system_status():
    status = await SystemService.get_system_status()
    return ApiResponse.success(data=status)

@router.post("/system-control/status")
async def set_system_status(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    status = body.get("status", "ONLINE")
    reason = body.get("reason")
    res = await SystemService.set_system_status(status, reason, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=res, message=res.get("message", "System status updated"))

# --- DATABASE TOOLS ---
@router.get("/database/collections")
async def get_database_collections(current_user: Dict[str, Any] = Depends(get_current_user)):
    colls = await SystemService.get_collection_list()
    return ApiResponse.success(data=colls)

@router.get("/database/query")
async def query_database(
    collection: str,
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    res = await SystemService.query_collection(collection, page=page, limit=limit, search=search)
    return ApiResponse.success(data=res)

@router.post("/database/record")
async def create_database_record(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    coll = body.get("collection")
    data = body.get("data", {})
    res = await SystemService.create_record(coll, data, current_user)
    return ApiResponse.success(data=res, message="Record created")

@router.put("/database/record/{rec_id}")
async def update_database_record(rec_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    coll = body.get("collection")
    data = body.get("data", {})
    data["id"] = rec_id
    res = await SystemService.update_record(coll, data, current_user)
    return ApiResponse.success(data=res, message="Record updated")

@router.delete("/database/record/{rec_id}")
async def delete_database_record(rec_id: str, request: Request, current_user: Dict[str, Any] = Depends(get_current_user)):
    coll = request.query_params.get("collection")
    if not coll:
        body = await request.json() if request.headers.get("content-type") == "application/json" else {}
        coll = body.get("collection")
    await SystemService.delete_record(coll, rec_id, current_user)
    return ApiResponse.success(message="Record deleted")

@router.post("/database/clear-collection")
async def clear_collection(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    coll = body.get("collection")
    if coll in ["users", "roles", "permissions"]:
        raise HTTPException(status_code=400, detail={"success": False, "message": "Cannot clear security collections."})
    db = get_db()
    db[coll].delete_many({})
    return ApiResponse.success(message=f"Collection '{coll}' cleared.")

@router.post("/database/export")
async def export_collection(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    coll = body.get("collection")
    db = get_db()
    docs = list(db[coll].find({}, {"_id": 0}))
    return ApiResponse.success(data=docs)

@router.post("/database/import")
async def import_collection(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    coll = body.get("collection")
    records = body.get("records", [])
    db = get_db()
    inserted = 0
    for r in records:
        if r.get("id"):
            db[coll].update_one({"id": r["id"]}, {"$set": r}, upsert=True)
            inserted += 1
    return ApiResponse.success(message=f"Imported {inserted} records into '{coll}'.")

@router.post("/database/reseed")
async def reseed_database(current_user: Dict[str, Any] = Depends(get_current_user)):
    return ApiResponse.error(message="Database reseed is permanently disabled in production mode.")

@router.post("/database/snapshot")
async def create_snapshot(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    colls = db.list_collection_names()
    snap_data = {}
    for c in colls:
        snap_data[c] = list(db[c].find({}, {"_id": 0}))
    return ApiResponse.success(data={"collections": len(colls), "timestamp": datetime.now(timezone.utc).isoformat()})

@router.post("/database/date-preview")
async def date_preview(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    date_str = body.get("date")
    db = get_db()
    orders_cnt = db.orders.count_documents({"createdAt": {"$regex": f"^{date_str}"}})
    bills_cnt = db.bills.count_documents({"createdAt": {"$regex": f"^{date_str}"}})
    return ApiResponse.success(data={"date": date_str, "orders": orders_cnt, "bills": bills_cnt})

@router.post("/database/date-purge")
async def date_purge(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    date_str = body.get("date")
    db = get_db()
    db.orders.delete_many({"createdAt": {"$regex": f"^{date_str}"}})
    db.bills.delete_many({"createdAt": {"$regex": f"^{date_str}"}})
    db.kot_tickets.delete_many({"createdAt": {"$regex": f"^{date_str}"}})
    db.payments.delete_many({"createdAt": {"$regex": f"^{date_str}"}})
    return ApiResponse.success(message=f"Purged records for {date_str}.")
