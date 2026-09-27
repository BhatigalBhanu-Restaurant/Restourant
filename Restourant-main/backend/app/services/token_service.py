import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from ..database import get_db
from ..sockets import SocketEvents
from .audit_service import create_audit_log

class TokenService:
    @staticmethod
    async def get_queue(status: Optional[str] = None, date: Optional[str] = None) -> List[Dict[str, Any]]:
        db = get_db()
        filter_q = {}
        if date:
            filter_q["tokenDate"] = date
        else:
            filter_q["tokenDate"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        if status and status != "ALL":
            filter_q["status"] = status
        else:
            filter_q["status"] = {"$in": ["WAITING", "CALLED", "RECALLED", "SKIPPED"]}

        return list(db.queue_tokens.find(filter_q, {"_id": 0}).sort("tokenNumber", 1))

    @staticmethod
    async def get_token_metrics(date: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        tokens = list(db.queue_tokens.find({"tokenDate": target_date}))

        total = len(tokens)
        waiting = sum(1 for t in tokens if t.get("status") in ["WAITING", "CALLED", "RECALLED"])
        seated = sum(1 for t in tokens if t.get("status") in ["SEATED", "COMPLETED"])
        cancelled = sum(1 for t in tokens if t.get("status") in ["CANCELLED", "SKIPPED"])

        return {
            "totalTokens": total,
            "waitingTokens": waiting,
            "seatedTokens": seated,
            "cancelledTokens": cancelled,
            "date": target_date
        }

    @staticmethod
    async def generate_token(data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        count = db.queue_tokens.count_documents({"tokenDate": today})
        token_num = count + 1
        token_code = f"T-{token_num}"
        token_id = f"tok_{uuid.uuid4().hex[:8]}"

        doc = {
            "id": token_id,
            "tokenNumber": token_num,
            "tokenCode": token_code,
            "tokenDate": today,
            "customerName": data.get("customerName", "Guest"),
            "customerPhone": data.get("customerPhone", ""),
            "partySize": int(data.get("partySize", 2)),
            "status": "WAITING",
            "tableId": data.get("tableId"),
            "estimatedWaitMinutes": int(data.get("estimatedWaitMinutes", 15)),
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }

        db.queue_tokens.insert_one(doc)
        doc.pop("_id", None)

        await SocketEvents.emit_token_updated(doc)
        await SocketEvents.emit_data_changed("tokens")

        await create_audit_log(
            module="Token & Queue",
            action="GENERATE_TOKEN",
            user_id=user_id,
            username=username,
            record_id=token_id,
            new_value={"code": token_code, "partySize": doc["partySize"]}
        )

        return doc

    @staticmethod
    async def call_token(token_id: str, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        token = db.queue_tokens.find_one({"id": token_id})
        if not token:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Token not found."})

        now = datetime.now(timezone.utc)
        db.queue_tokens.update_one(
            {"id": token_id},
            {"$set": {"status": "CALLED", "calledAt": now, "updatedAt": now}}
        )
        token["status"] = "CALLED"
        token["calledAt"] = now.isoformat()
        token.pop("_id", None)

        await SocketEvents.emit_token_called(token)
        await SocketEvents.emit_token_updated(token)
        await SocketEvents.emit_data_changed("tokens")
        return token

    @staticmethod
    async def recall_token(token_id: str) -> Dict[str, Any]:
        db = get_db()
        token = db.queue_tokens.find_one({"id": token_id})
        if not token:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Token not found."})

        now = datetime.now(timezone.utc)
        db.queue_tokens.update_one(
            {"id": token_id},
            {"$set": {"status": "RECALLED", "calledAt": now, "updatedAt": now}}
        )
        token["status"] = "RECALLED"
        token["calledAt"] = now.isoformat()
        token.pop("_id", None)

        await SocketEvents.emit_token_called(token)
        await SocketEvents.emit_token_updated(token)
        await SocketEvents.emit_data_changed("tokens")
        return token

    @staticmethod
    async def skip_token(token_id: str) -> Dict[str, Any]:
        db = get_db()
        db.queue_tokens.update_one(
            {"id": token_id},
            {"$set": {"status": "SKIPPED", "updatedAt": datetime.now(timezone.utc)}}
        )
        token = db.queue_tokens.find_one({"id": token_id}, {"_id": 0})
        await SocketEvents.emit_token_updated(token)
        await SocketEvents.emit_data_changed("tokens")
        return token

    @staticmethod
    async def seat_token(token_id: str, table_id: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        now = datetime.now(timezone.utc)
        update_fields = {"status": "SEATED", "seatedAt": now, "updatedAt": now}
        if table_id:
            update_fields["tableId"] = table_id

        db.queue_tokens.update_one({"id": token_id}, {"$set": update_fields})
        token = db.queue_tokens.find_one({"id": token_id}, {"_id": 0})
        await SocketEvents.emit_token_updated(token)
        await SocketEvents.emit_data_changed("tokens")
        return token

    @staticmethod
    async def complete_token(token_id: str) -> Dict[str, Any]:
        db = get_db()
        now = datetime.now(timezone.utc)
        db.queue_tokens.update_one(
            {"id": token_id},
            {"$set": {"status": "COMPLETED", "completedAt": now, "updatedAt": now}}
        )
        token = db.queue_tokens.find_one({"id": token_id}, {"_id": 0})
        await SocketEvents.emit_token_updated(token)
        await SocketEvents.emit_data_changed("tokens")
        return token

    @staticmethod
    async def cancel_token(token_id: str) -> Dict[str, Any]:
        db = get_db()
        now = datetime.now(timezone.utc)
        db.queue_tokens.update_one(
            {"id": token_id},
            {"$set": {"status": "CANCELLED", "cancelledAt": now, "updatedAt": now}}
        )
        token = db.queue_tokens.find_one({"id": token_id}, {"_id": 0})
        await SocketEvents.emit_token_updated(token)
        await SocketEvents.emit_data_changed("tokens")
        return token
