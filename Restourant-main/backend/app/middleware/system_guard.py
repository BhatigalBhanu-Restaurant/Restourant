from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from ..database import get_db
from ..utils.security import verify_access_token

class SystemStatusGuardMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        url = request.url.path

        # Always bypass health checks, auth endpoints, static uploads, and system status switchboard
        if (
            url == "/health"
            or url.startswith("/api/auth")
            or url.startswith("/api/system/system-control")
            or url.startswith("/uploads")
            or url.startswith("/socket.io")
            or not url.startswith("/api")
        ):
            return await call_next(request)

        try:
            db = get_db()
            setting = db.system_settings.find_one({"key": "system_status"})
            status = setting.get("value") if setting else "ONLINE"

            if status == "ONLINE":
                return await call_next(request)

            # Check user role from authorization header
            auth_header = request.headers.get("Authorization")
            user_role = None
            username = None

            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                try:
                    decoded = verify_access_token(token)
                    user_role = decoded.get("roleName") or decoded.get("roleId")
                    username = decoded.get("username")
                except Exception:
                    pass

            # Super Admin & System Admin bypass all maintenance/lockdown restrictions
            is_super = (
                user_role in ["Super Admin", "role_super_admin", "System Admin", "System Administrator", "Admin", "role_admin", "role_system_admin"]
                or username in ["superadmin", "admin"]
            )
            if is_super:
                return await call_next(request)

            if status == "EMERGENCY_LOCKDOWN":
                return JSONResponse(
                    status_code=503,
                    content={
                        "success": False,
                        "message": "System is in Emergency Lockdown mode. All non-administrative operations are halted.",
                        "code": "EMERGENCY_LOCKDOWN"
                    }
                )

            if status == "MAINTENANCE":
                return JSONResponse(
                    status_code=503,
                    content={
                        "success": False,
                        "message": "System is currently undergoing scheduled maintenance. Please try again later.",
                        "code": "MAINTENANCE_MODE"
                    }
                )

        except Exception:
            # In case of DB error checking status, allow request to proceed so health and DB errors are reported properly
            pass

        return await call_next(request)
