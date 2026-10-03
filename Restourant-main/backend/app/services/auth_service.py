import uuid
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException
from ..database import get_db
from ..utils.security import (
    verify_password,
    hash_password,
    generate_access_token,
    generate_refresh_token,
    verify_refresh_token
)
from ..middleware.auth import calculate_effective_permissions
from .audit_service import create_audit_log

class AuthService:
    @staticmethod
    async def login(username_or_email: str, password: str, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> Dict[str, Any]:
        trimmed = (username_or_email or "").strip()
        if not trimmed:
            raise HTTPException(status_code=400, detail={"success": False, "message": "Username or email is required."})

        db = get_db()
        regex_pattern = f"^{re.escape(trimmed)}$"
        user = db.users.find_one({
            "$or": [
                {"username": {"$regex": regex_pattern, "$options": "i"}},
                {"email": {"$regex": regex_pattern, "$options": "i"}}
            ]
        })

        if not user:
            user = db.users.find_one({"$or": [{"username": trimmed}, {"email": trimmed}]})

        if not user:
            raise HTTPException(status_code=401, detail={"success": False, "message": "Invalid username or password.", "code": "UNAUTHORIZED"})

        user_status = user.get("status", "ACTIVE")
        if user_status != "ACTIVE" and user.get("username") != "superadmin":
            raise HTTPException(status_code=403, detail={"success": False, "message": f"Account is {user_status.lower()}. Please contact administrator.", "code": "FORBIDDEN"})

        # Check account lockout
        locked_until = user.get("lockedUntil")
        if locked_until and user.get("username") != "superadmin":
            if isinstance(locked_until, datetime) and locked_until > datetime.now(timezone.utc):
                wait_mins = max(1, int((locked_until - datetime.now(timezone.utc)).total_seconds() / 60))
                raise HTTPException(status_code=403, detail={"success": False, "message": f"Account is temporarily locked. Try again in {wait_mins} minutes.", "code": "ACCOUNT_LOCKED"})

        stored_hash = user.get("passwordHash") or user.get("password") or user.get("pass") or ""
        is_match = verify_password(password, stored_hash)

        if not is_match:
            failed = user.get("failedLoginAttempts", 0) + 1
            update_data = {"failedLoginAttempts": failed}
            if failed >= 5:
                update_data["lockedUntil"] = datetime.now(timezone.utc) + timedelta(minutes=15)
            db.users.update_one({"id": user["id"]}, {"$set": update_data})
            raise HTTPException(status_code=401, detail={"success": False, "message": "Invalid username or password.", "code": "UNAUTHORIZED"})

        # If stored password was plain text, upgrade to secure bcrypt hash
        if stored_hash and not (stored_hash.startswith("$2a$") or stored_hash.startswith("$2b$") or stored_hash.startswith("$2y$")):
            try:
                new_hash = hash_password(password)
                db.users.update_one({"id": user["id"]}, {"$set": {"passwordHash": new_hash}})
            except Exception:
                pass

        # Reset failed attempts & record login
        db.users.update_one(
            {"id": user["id"]},
            {
                "$set": {
                    "failedLoginAttempts": 0,
                    "lockedUntil": None,
                    "lastLogin": datetime.now(timezone.utc)
                }
            }
        )

        role = db.roles.find_one({"id": user.get("roleId")})
        role_name = role.get("name") if role else ("Super Admin" if user.get("roleId") == "role_super_admin" else "User")

        jwt_payload = {
            "userId": user["id"],
            "username": user["username"],
            "roleId": user.get("roleId", ""),
            "roleName": role_name
        }

        access_token = generate_access_token(jwt_payload)
        refresh_token = generate_refresh_token(jwt_payload)

        # Session tracking
        session_id = str(uuid.uuid4())
        try:
            db.user_sessions.insert_one({
                "id": session_id,
                "userId": user["id"],
                "tokenHash": access_token[-16:],
                "ipAddress": ip_address,
                "userAgent": user_agent,
                "isActive": True,
                "expiresAt": datetime.now(timezone.utc) + timedelta(days=7),
                "createdAt": datetime.now(timezone.utc)
            })
        except Exception:
            pass

        # Effective permissions
        perm_map = await calculate_effective_permissions(user["id"], user.get("roleId", ""), user["username"])
        effective_permissions = [v for v in perm_map.values() if v.get("granted")]

        await create_audit_log(
            module="Authentication",
            action="LOGIN",
            user_id=user["id"],
            username=user["username"],
            role_name=role_name,
            record_id=session_id,
            ip_address=ip_address,
            device_info=user_agent
        )

        return {
            "accessToken": access_token,
            "refreshToken": refresh_token,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user.get("email", f"{user['username']}@erp.com"),
                "firstName": user.get("firstName", user["username"]),
                "lastName": user.get("lastName", ""),
                "phone": user.get("phone", ""),
                "roleId": user.get("roleId", ""),
                "roleName": role_name,
                "avatarUrl": user.get("avatarUrl")
            },
            "effectivePermissions": effective_permissions
        }

    @staticmethod
    async def refresh_token(refresh_token_str: str) -> Dict[str, Any]:
        try:
            payload = verify_refresh_token(refresh_token_str)
        except Exception:
            raise HTTPException(status_code=401, detail={"success": False, "message": "Invalid or expired refresh token.", "code": "TOKEN_EXPIRED"})

        db = get_db()
        user = db.users.find_one({"$or": [{"id": payload.get("userId")}, {"username": payload.get("username")}]})
        if not user or user.get("status") in ["INACTIVE", "SUSPENDED", "LOCKED"]:
            raise HTTPException(status_code=401, detail={"success": False, "message": "User not found or inactive.", "code": "UNAUTHORIZED"})

        role = db.roles.find_one({"id": user.get("roleId")})
        role_name = role.get("name") if role else "User"

        new_payload = {
            "userId": user["id"],
            "username": user["username"],
            "roleId": user.get("roleId", ""),
            "roleName": role_name
        }

        new_access_token = generate_access_token(new_payload)
        return {
            "accessToken": new_access_token,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "roleId": user.get("roleId", ""),
                "roleName": role_name
            }
        }

    @staticmethod
    async def get_profile(user_id: str) -> Dict[str, Any]:
        db = get_db()
        user = db.users.find_one({"id": user_id}, {"_id": 0, "passwordHash": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=404, detail={"success": False, "message": "User profile not found."})

        role = db.roles.find_one({"id": user.get("roleId")})
        user["role"] = role.get("name") if role else "User"
        return user

    @staticmethod
    async def change_password(user_id: str, current_pass: str, new_pass: str) -> Dict[str, Any]:
        if len(new_pass) < 6:
            raise HTTPException(status_code=400, detail={"success": False, "message": "New password must be at least 6 characters."})

        db = get_db()
        user = db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail={"success": False, "message": "User not found."})

        stored_hash = user.get("passwordHash") or ""
        if not verify_password(current_pass, stored_hash):
            raise HTTPException(status_code=400, detail={"success": False, "message": "Incorrect current password."})

        new_hash = hash_password(new_pass)
        db.users.update_one({"id": user_id}, {"$set": {"passwordHash": new_hash, "updatedAt": datetime.now(timezone.utc)}})
        return {"success": True, "message": "Password changed successfully."}
