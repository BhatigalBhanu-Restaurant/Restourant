import json
from datetime import date, datetime
from typing import Any, Dict, Optional
from bson import ObjectId
from uuid import UUID
from fastapi.encoders import jsonable_encoder
import socketio

from .utils.logger import logger
from .utils.security import verify_access_token

def safe_json_default(obj: Any) -> Any:
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, (ObjectId, UUID)):
        return str(obj)
    try:
        return jsonable_encoder(obj)
    except Exception:
        return str(obj)

class SafeJson:
    @staticmethod
    def dumps(obj: Any, **kwargs) -> str:
        kwargs["default"] = safe_json_default
        return json.dumps(obj, **kwargs)

    @staticmethod
    def loads(s: str, **kwargs) -> Any:
        return json.loads(s, **kwargs)

def _safe(data: Any) -> Any:
    try:
        return jsonable_encoder(data)
    except Exception:
        return data

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    json=SafeJson
)

@sio.event
async def connect(sid, environ, auth):
    token = None
    if isinstance(auth, dict):
        token = auth.get("token")
    
    # Fallback to query string
    if not token:
        query_string = environ.get("QUERY_STRING", "")
        for param in query_string.split("&"):
            if param.startswith("token="):
                token = param.split("=")[1]
                break
                
    user = None
    if token:
        try:
            user = verify_access_token(token)
        except Exception:
            user = None

    async with sio.session(sid) as session:
        session["user"] = user
        session["is_anonymous"] = user is None

    username = user.get("username", "Anonymous/Display") if user else "Anonymous/Display"
    logger.info(f"Socket connected: {sid} ({username})")

    # Join role room if user has roleName
    if user and user.get("roleName"):
        role_room = f"role:{user.get('roleName')}"
        await sio.enter_room(sid, role_room)

@sio.event
async def disconnect(sid):
    logger.info(f"Socket disconnected: {sid}")

@sio.event
async def join_room(sid, data):
    room = data if isinstance(data, str) else data.get("room")
    if room:
        await sio.enter_room(sid, room)
        logger.debug(f"Socket {sid} joined room: {room}")

@sio.event
async def leave_room(sid, data):
    room = data if isinstance(data, str) else data.get("room")
    if room:
        await sio.leave_room(sid, room)

@sio.event
async def broadcast_change(sid, change_data):
    """Universal change broadcaster: Relays mutation to all other connected clients."""
    clean_data = _safe(change_data)
    await sio.emit("data.changed", clean_data, skip_sid=sid)
    entity = clean_data.get("entity") if isinstance(clean_data, dict) else None
    if entity in ["tables", "floor-zones"]:
        await sio.emit("table.updated", clean_data, skip_sid=sid)

class SocketEvents:
    @staticmethod
    async def emit_booking_updated(booking: Any):
        await sio.emit("booking.updated", _safe(booking))

    @staticmethod
    async def emit_master_updated(master_data: Any):
        await sio.emit("master.updated", _safe(master_data))

    @staticmethod
    async def emit_system_status_changed(status_data: Any):
        await sio.emit("system.status_changed", _safe(status_data))

    @staticmethod
    async def emit_data_changed(entity: str):
        await sio.emit("data.changed", {"entity": entity, "action": "UPDATE"})
