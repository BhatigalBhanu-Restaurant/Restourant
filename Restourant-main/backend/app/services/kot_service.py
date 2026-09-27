from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from ..database import get_db
from ..sockets import SocketEvents
from .audit_service import create_audit_log

class KOTService:
    @staticmethod
    async def get_active_kots() -> List[Dict[str, Any]]:
        db = get_db()
        tickets = list(db.kot_tickets.find(
            {"status": {"$in": ["NEW", "ACCEPTED", "PREPARING", "READY"]}},
            {"_id": 0}
        ).sort("createdAt", 1))

        # Sort urgent/high priority first
        priority_weights = {"URGENT": 0, "HIGH": 1, "NORMAL": 2, "LOW": 3}
        tickets.sort(key=lambda t: priority_weights.get(t.get("priority", "NORMAL"), 2))
        return tickets

    @staticmethod
    async def accept_kot(kot_id: str, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        now = datetime.now(timezone.utc)
        db.kot_tickets.update_one(
            {"id": kot_id},
            {"$set": {"status": "ACCEPTED", "acceptedAt": now, "updatedAt": now}}
        )
        kot = db.kot_tickets.find_one({"id": kot_id}, {"_id": 0})
        if not kot:
            raise HTTPException(status_code=404, detail={"success": False, "message": "KOT not found."})

        await SocketEvents.emit_kot_updated(kot)
        await SocketEvents.emit_data_changed("kitchen")
        return kot

    @staticmethod
    async def start_preparing(kot_id: str, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        now = datetime.now(timezone.utc)
        db.kot_tickets.update_one(
            {"id": kot_id},
            {"$set": {"status": "PREPARING", "preparingAt": now, "items.$[].status": "PREPARING", "updatedAt": now}}
        )
        kot = db.kot_tickets.find_one({"id": kot_id}, {"_id": 0})
        if not kot:
            raise HTTPException(status_code=404, detail={"success": False, "message": "KOT not found."})

        await SocketEvents.emit_kot_updated(kot)
        await SocketEvents.emit_data_changed("kitchen")
        return kot

    @staticmethod
    async def mark_ready(kot_id: str, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        now = datetime.now(timezone.utc)
        db.kot_tickets.update_one(
            {"id": kot_id},
            {"$set": {"status": "READY", "readyAt": now, "items.$[].status": "READY", "updatedAt": now}}
        )
        kot = db.kot_tickets.find_one({"id": kot_id}, {"_id": 0})
        if not kot:
            raise HTTPException(status_code=404, detail={"success": False, "message": "KOT not found."})

        await SocketEvents.emit_kot_ready(kot)
        await SocketEvents.emit_kot_updated(kot)
        await SocketEvents.emit_data_changed("kitchen")
        return kot

    @staticmethod
    async def mark_served(kot_id: str, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        now = datetime.now(timezone.utc)
        db.kot_tickets.update_one(
            {"id": kot_id},
            {"$set": {"status": "SERVED", "servedAt": now, "items.$[].status": "SERVED", "updatedAt": now}}
        )
        kot = db.kot_tickets.find_one({"id": kot_id}, {"_id": 0})
        if not kot:
            raise HTTPException(status_code=404, detail={"success": False, "message": "KOT not found."})

        await SocketEvents.emit_kot_updated(kot)
        await SocketEvents.emit_data_changed("kitchen")
        return kot

    @staticmethod
    async def set_priority(kot_id: str, priority: str) -> Dict[str, Any]:
        db = get_db()
        db.kot_tickets.update_one(
            {"id": kot_id},
            {"$set": {"priority": priority, "updatedAt": datetime.now(timezone.utc)}}
        )
        kot = db.kot_tickets.find_one({"id": kot_id}, {"_id": 0})
        if not kot:
            raise HTTPException(status_code=404, detail={"success": False, "message": "KOT not found."})

        await SocketEvents.emit_kot_updated(kot)
        await SocketEvents.emit_data_changed("kitchen")
        return kot
