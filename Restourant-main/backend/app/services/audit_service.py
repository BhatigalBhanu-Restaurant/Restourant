import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from ..database import get_db

async def create_audit_log(
    module: str,
    action: str,
    user_id: Optional[str] = None,
    username: Optional[str] = None,
    role_name: Optional[str] = None,
    record_id: Optional[str] = None,
    old_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    ip_address: Optional[str] = None,
    device_info: Optional[str] = None,
    status: str = "SUCCESS"
):
    try:
        db = get_db()
        doc = {
            "id": f"aud_{uuid.uuid4().hex[:12]}",
            "userId": user_id,
            "username": username or "system",
            "roleName": role_name,
            "module": module,
            "action": action,
            "recordId": record_id,
            "oldValue": old_value,
            "newValue": new_value,
            "ipAddress": ip_address,
            "deviceInfo": device_info,
            "status": status,
            "timestamp": datetime.now(timezone.utc)
        }
        db.audit_logs.insert_one(doc)
    except Exception as e:
        # Audit logging failure should not break the business action
        pass
