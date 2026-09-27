import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any, Optional, List
from ..database import get_db
from ..middleware.auth import get_current_user
from ..utils.response import ApiResponse
from ..utils.security import hash_password
from ..constants.permissions import ALL_PERMISSIONS

router = APIRouter(prefix="/access-control", tags=["Access Control & RBAC"])

@router.get("/permissions-tree")
async def get_permissions_tree(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    db_perms = list(db.permissions.find({}, {"_id": 0}))
    perms = db_perms if db_perms else ALL_PERMISSIONS

    modules_tree: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}
    for p in perms:
        mod = p.get("module", "General")
        sub = p.get("submodule", "Default")
        if mod not in modules_tree:
            modules_tree[mod] = {}
        if sub not in modules_tree[mod]:
            modules_tree[mod][sub] = []
        modules_tree[mod][sub].append(p)

    return ApiResponse.success(data={
        "total": len(perms),
        "rawList": perms,
        "modules": modules_tree
    })

# --- USERS ---
@router.get("/users")
async def get_users(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    users = list(db.users.find({}, {"_id": 0, "passwordHash": 0, "password": 0}).sort("createdAt", -1))
    roles = {r["id"]: r.get("name") for r in db.roles.find({}, {"_id": 0, "id": 1, "name": 1})}
    for u in users:
        u["role"] = {"id": u.get("roleId"), "name": roles.get(u.get("roleId"), "User")}
    return ApiResponse.success(data=users)

@router.post("/users")
async def create_user(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    username = (body.get("username") or "").strip()
    if not username:
        raise HTTPException(status_code=400, detail={"success": False, "message": "Username is required."})

    existing = db.users.find_one({"username": username})
    if existing:
        raise HTTPException(status_code=400, detail={"success": False, "message": "Username already exists."})

    pwd = body.get("password") or "Welcome@123"
    pwd_hash = hash_password(pwd)
    user_id = f"usr_{uuid.uuid4().hex[:8]}"

    doc = {
        "id": user_id,
        "username": username,
        "email": body.get("email", f"{username}@erp.com"),
        "passwordHash": pwd_hash,
        "firstName": body.get("firstName", username),
        "lastName": body.get("lastName", ""),
        "phone": body.get("phone", ""),
        "roleId": body.get("roleId", "role_cashier"),
        "status": body.get("status", "ACTIVE"),
        "failedLoginAttempts": 0,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    db.users.insert_one(doc)
    doc.pop("_id", None)
    doc.pop("passwordHash", None)
    return ApiResponse.success(data=doc, message="User account created successfully")

@router.put("/users/{user_id}")
async def update_user(user_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    update_data = {
        "firstName": body.get("firstName"),
        "lastName": body.get("lastName"),
        "email": body.get("email"),
        "phone": body.get("phone"),
        "roleId": body.get("roleId"),
        "status": body.get("status", "ACTIVE"),
        "updatedAt": datetime.now(timezone.utc)
    }
    if body.get("password"):
        update_data["passwordHash"] = hash_password(body["password"])

    db.users.update_one({"id": user_id}, {"$set": update_data})
    updated = db.users.find_one({"id": user_id}, {"_id": 0, "passwordHash": 0})
    return ApiResponse.success(data=updated, message="User updated successfully")

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    user = db.users.find_one({"id": user_id})
    if user and user.get("username") == "superadmin":
        raise HTTPException(status_code=400, detail={"success": False, "message": "Cannot delete superadmin account."})
    db.users.delete_one({"id": user_id})
    return ApiResponse.success(message="User deleted successfully")

# --- ROLES ---
@router.get("/roles")
async def get_roles(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    roles = list(db.roles.find({}, {"_id": 0}).sort("name", 1))
    return ApiResponse.success(data=roles)

@router.post("/roles")
async def create_role(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail={"success": False, "message": "Role name is required."})

    role_id = body.get("id") or f"role_{uuid.uuid4().hex[:8]}"
    doc = {
        "id": role_id,
        "name": name,
        "description": body.get("description", f"{name} Role"),
        "isSystem": False,
        "permissions": body.get("permissions", []),
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    db.roles.insert_one(doc)
    doc.pop("_id", None)
    return ApiResponse.success(data=doc, message="Role created successfully")

@router.delete("/roles/{role_id}")
async def delete_role(role_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    role = db.roles.find_one({"id": role_id})
    if role and role.get("isSystem"):
        raise HTTPException(status_code=400, detail={"success": False, "message": "System roles cannot be deleted."})
    db.roles.delete_one({"id": role_id})
    return ApiResponse.success(message="Role deleted successfully")

@router.put("/roles/{role_id}/permissions")
async def update_role_permissions(role_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    perms = body.get("permissions", [])
    db.roles.update_one(
        {"id": role_id},
        {"$set": {"permissions": perms, "updatedAt": datetime.now(timezone.utc)}}
    )
    return ApiResponse.success(message="Role permissions updated successfully")
