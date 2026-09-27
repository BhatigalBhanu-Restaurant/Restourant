import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from ..database import get_db
from ..sockets import SocketEvents
from .audit_service import create_audit_log

class SystemService:
    # --- NOTIFICATIONS ---
    @staticmethod
    async def get_notifications(user_id: Optional[str] = None, role_id: Optional[str] = None) -> List[Dict[str, Any]]:
        db = get_db()
        filter_q = {
            "$or": [
                {"recipientUserId": user_id},
                {"recipientRoleId": role_id},
                {"recipientUserId": None, "recipientRoleId": None}
            ]
        }
        return list(db.system_notifications.find(filter_q, {"_id": 0}).sort("createdAt", -1).limit(50))

    @staticmethod
    async def create_notification(data: Dict[str, Any]) -> Dict[str, Any]:
        db = get_db()
        doc = {
            "id": f"notif_{uuid.uuid4().hex[:8]}",
            **data,
            "isRead": False,
            "createdAt": datetime.now(timezone.utc)
        }
        db.system_notifications.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @staticmethod
    async def mark_notification_read(notif_id: str) -> Dict[str, Any]:
        db = get_db()
        db.system_notifications.update_one({"id": notif_id}, {"$set": {"isRead": True}})
        return db.system_notifications.find_one({"id": notif_id}, {"_id": 0})

    @staticmethod
    async def mark_all_notifications_read(user_id: Optional[str] = None):
        db = get_db()
        db.system_notifications.update_many({"recipientUserId": user_id}, {"$set": {"isRead": True}})
        return {"success": True}

    # --- AUDIT LOGS ---
    @staticmethod
    async def get_audit_logs(query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        db = get_db()
        filter_q = {}
        if query:
            if query.get("module"):
                filter_q["module"] = query["module"]
            if query.get("action"):
                filter_q["action"] = query["action"]
            if query.get("username"):
                filter_q["username"] = {"$regex": query["username"], "$options": "i"}

        return list(db.audit_logs.find(filter_q, {"_id": 0}).sort("timestamp", -1).limit(200))

    # --- SYSTEM CONTROL SWITCHBOARD ---
    @staticmethod
    async def get_system_status() -> Dict[str, Any]:
        db = get_db()
        status_setting = db.system_settings.find_one({"key": "system_status"})
        logs = list(db.maintenance_logs.find({}, {"_id": 0}).sort("createdAt", -1).limit(10))
        all_settings = list(db.system_settings.find({}, {"_id": 0}))

        return {
            "status": status_setting.get("value") if status_setting else "ONLINE",
            "settings": all_settings,
            "recentMaintenance": logs
        }

    @staticmethod
    async def set_system_status(status: str, reason: Optional[str] = None, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        now = datetime.now(timezone.utc)
        db.system_settings.update_one(
            {"key": "system_status"},
            {"$set": {"value": status, "updatedAt": now}},
            upsert=True
        )

        log_id = f"maint_{uuid.uuid4().hex[:8]}"
        log_doc = {
            "id": log_id,
            "status": status,
            "reason": reason or f"Switched status to {status}",
            "initiatedBy": user_id,
            "createdAt": now
        }
        db.maintenance_logs.insert_one(log_doc)
        log_doc.pop("_id", None)

        await SocketEvents.emit_system_status_changed({"status": status, "reason": reason, "timestamp": now.isoformat()})

        await create_audit_log(
            module="System Control",
            action=f"SYSTEM_STATUS_{status}",
            user_id=user_id,
            username=username,
            record_id=log_id,
            new_value={"status": status, "reason": reason}
        )

        return {"status": status, "log": log_doc, "message": f"System operational mode updated to {status}"}

    @staticmethod
    async def get_settings() -> Dict[str, str]:
        db = get_db()
        docs = list(db.system_settings.find({}, {"_id": 0}))
        return {d["key"]: d.get("value", "") for d in docs}

    @staticmethod
    async def get_all_detailed_settings() -> List[Dict[str, Any]]:
        db = get_db()
        return list(db.system_settings.find({}, {"_id": 0}))

    @staticmethod
    async def update_settings(settings_map: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        now = datetime.now(timezone.utc)
        for k, v in settings_map.items():
            db.system_settings.update_one(
                {"key": k},
                {"$set": {"value": str(v), "updatedAt": now}},
                upsert=True
            )
        return {"success": True, "message": f"Updated {len(settings_map)} configuration settings."}

    @staticmethod
    async def save_single_setting(data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        key = data.get("key")
        db.system_settings.update_one(
            {"key": key},
            {"$set": {**data, "updatedAt": datetime.now(timezone.utc)}},
            upsert=True
        )
        return db.system_settings.find_one({"key": key}, {"_id": 0})

    @staticmethod
    async def delete_setting(key: str, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        db.system_settings.delete_one({"key": key})
        return {"success": True}

    # --- DATABASE EXPLORER & CRUD ---
    @staticmethod
    async def get_collection_list() -> List[Dict[str, Any]]:
        db = get_db()
        colls = db.list_collection_names()
        res = []
        for c in colls:
            res.append({
                "name": c,
                "count": db[c].count_documents({})
            })
        return res

    @staticmethod
    async def query_collection(collection_name: str, page: int = 1, limit: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        col = db[collection_name]
        filter_q = {}
        if search:
            filter_q["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"id": {"$regex": search, "$options": "i"}}
            ]
        total = col.count_documents(filter_q)
        records = list(col.find(filter_q, {"_id": 0}).skip((page - 1) * limit).limit(limit))
        return {
            "records": records,
            "total": total,
            "page": page,
            "limit": limit
        }

    @staticmethod
    async def create_record(collection_name: str, data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
        db = get_db()
        if not data.get("id"):
            data["id"] = str(uuid.uuid4())
        data["createdAt"] = datetime.now(timezone.utc)
        db[collection_name].insert_one(data)
        data.pop("_id", None)
        return data

    @staticmethod
    async def update_record(collection_name: str, data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
        db = get_db()
        rec_id = data.get("id")
        data["updatedAt"] = datetime.now(timezone.utc)
        db[collection_name].update_one({"id": rec_id}, {"$set": data})
        return db[collection_name].find_one({"id": rec_id}, {"_id": 0})

    @staticmethod
    async def delete_record(collection_name: str, rec_id: str, user: Dict[str, Any]) -> Dict[str, Any]:
        db = get_db()
        db[collection_name].delete_one({"id": rec_id})
        return {"success": True}
