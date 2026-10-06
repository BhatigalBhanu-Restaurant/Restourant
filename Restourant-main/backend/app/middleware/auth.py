from fastapi import Request, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List, Union, Dict, Any, Set
from ..database import get_db
from ..utils.security import verify_access_token
from ..constants.permissions import ALL_PERMISSIONS

security = HTTPBearer(auto_error=False)

_cached_permissions: Optional[List[Dict[str, Any]]] = None

async def calculate_effective_permissions(user_id: str, role_id: str, username: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
    global _cached_permissions
    db = get_db()
    result = {}

    role = db.roles.find_one({"id": role_id})
    role_name = role.get("name") if role else ""

    is_super_admin = (
        role_name in ["Super Admin", "System Admin", "System Administrator", "Admin"]
        or role_id in ["role_super_admin", "role_admin", "role_system_admin", "superadmin", "admin"]
        or username in ["superadmin", "admin"]
    )

    role_perms = set(role.get("permissions", [])) if role else set()

    # Use cached permissions if available to avoid repeated DB latency
    if _cached_permissions is None:
        try:
            db_perms = list(db.permissions.find({}, {"_id": 0, "id": 1}))
            _cached_permissions = db_perms if db_perms else ALL_PERMISSIONS
        except Exception:
            _cached_permissions = ALL_PERMISSIONS

    perm_list = _cached_permissions or ALL_PERMISSIONS

    for p in perm_list:
        perm_id = p["id"]
        if is_super_admin:
            result[perm_id] = {
                "permissionId": perm_id,
                "source": "SYSTEM",
                "granted": True
            }
        else:
            result[perm_id] = {
                "permissionId": perm_id,
                "source": "ROLE",
                "granted": perm_id in role_perms
            }

    return result

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> Dict[str, Any]:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=401,
            detail={"success": False, "message": "Authentication token required.", "code": "UNAUTHORIZED"}
        )

    token = credentials.credentials
    try:
        payload = verify_access_token(token)
    except Exception:
        raise HTTPException(
            status_code=401,
            detail={"success": False, "message": "Invalid or expired session token.", "code": "TOKEN_EXPIRED"}
        )

    user_id = payload.get("userId")
    db = get_db()
    user = db.users.find_one({"id": user_id})
    if not user:
        # Fallback by username
        user = db.users.find_one({"username": payload.get("username")})

    if not user or user.get("status") != "ACTIVE":
        raise HTTPException(
            status_code=401,
            detail={"success": False, "message": "User account is inactive or suspended.", "code": "ACCOUNT_INACTIVE"}
        )

    # Calculate effective permissions
    perm_map = await calculate_effective_permissions(
        user["id"],
        user.get("roleId", ""),
        user.get("username", "")
    )
    
    granted_perms = {k for k, v in perm_map.items() if v.get("granted") is True}

    return {
        "userId": user["id"],
        "username": user["username"],
        "email": user.get("email", ""),
        "roleId": user.get("roleId", ""),
        "roleName": payload.get("roleName", "User"),
        "effectivePermissions": granted_perms,
        "permissionMap": perm_map,
        "userDoc": user
    }

async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> Optional[Dict[str, Any]]:
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = verify_access_token(credentials.credentials)
        user_id = payload.get("userId")
        db = get_db()
        user = db.users.find_one({"id": user_id}) or db.users.find_one({"username": payload.get("username")})
        if user and user.get("status") == "ACTIVE":
            perm_map = await calculate_effective_permissions(user["id"], user.get("roleId", ""), user.get("username", ""))
            granted_perms = {k for k, v in perm_map.items() if v.get("granted") is True}
            return {
                "userId": user["id"],
                "username": user["username"],
                "email": user.get("email", ""),
                "roleId": user.get("roleId", ""),
                "roleName": payload.get("roleName", "User"),
                "effectivePermissions": granted_perms,
                "permissionMap": perm_map,
                "userDoc": user
            }
        return None
    except Exception:
        return None

def require_permission(required: Union[str, List[str]]):
    async def permission_dependency(current_user: Dict[str, Any] = Depends(get_current_user)):
        required_list = [required] if isinstance(required, str) else required
        user_perms: Set[str] = current_user.get("effectivePermissions", set())

        # Check if user has any of the required permissions
        has_perm = any(p in user_perms for p in required_list)
        if not has_perm:
            req_str = " or ".join(required_list)
            raise HTTPException(
                status_code=403,
                detail={
                    "success": False,
                    "message": f"You do not have permission to perform this action. Required: {req_str}",
                    "code": "FORBIDDEN"
                }
            )
        return current_user
    return permission_dependency
