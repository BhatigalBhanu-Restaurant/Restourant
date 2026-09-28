import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import socketio

from .app.config import settings
from .app.database import get_db, ensure_indexes
from .app.sockets import sio
from .app.seeds import run_database_seeds
from .app.utils.logger import logger
from .app.middleware.system_guard import SystemStatusGuardMiddleware

# Import routers
from .app.routers import (
    auth,
    dashboard,
    bookings,
    masters,
    inventory,
    purchases,
    accounts,
    expenses,
    hr,
    access_control,
    reports,
    system,
    daily_menu
)
from .app.routers import calendar as calendar_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Restaurant ERP Backend Services...")
    try:
        ensure_indexes()
        db = get_db()
        # Auto-seed if database is brand new or superadmin is missing
        user_count = db.users.count_documents({})
        superadmin = db.users.find_one({"username": "superadmin"})
        if user_count == 0 or not superadmin:
            logger.info("Database appears uninitialized or missing superadmin. Running auto-seed...")
            run_database_seeds()
            logger.info("Auto-seeding complete.")
        else:
            logger.info(f"Database connected. Found {user_count} registered users.")
    except Exception as e:
        logger.error(f"Startup initialization error: {e}")
    yield
    logger.info("Shutting down Restaurant ERP Backend Services...")

app = FastAPI(
    title="Kathiyawadi Restaurant Management ERP API",
    description="Full-stack enterprise restaurant ERP backend in Python",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Configuration
# Allow requests from localhost, all Vercel domains (*.vercel.app), Render, and any custom web origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_origin_regex=r"^https?://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# System Guard (Lockdown / Maintenance mode)
app.add_middleware(SystemStatusGuardMiddleware)

from fastapi.encoders import jsonable_encoder

# Global Exception Handlers ensuring unified response envelope
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        return JSONResponse(status_code=exc.status_code, content=jsonable_encoder(detail))
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": str(detail),
            "data": None,
            "errors": None
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": f"Internal Server Error: {str(exc)}",
            "data": None,
            "errors": None
        }
    )

# Register Routers under /api
api_prefix = "/api"
app.include_router(auth.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(bookings.router, prefix=api_prefix)
app.include_router(masters.router, prefix=api_prefix)
app.include_router(inventory.router, prefix=api_prefix)
app.include_router(purchases.router, prefix=api_prefix)
app.include_router(accounts.router, prefix=api_prefix)
app.include_router(expenses.router, prefix=api_prefix)
app.include_router(hr.router, prefix=api_prefix)
app.include_router(access_control.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)
app.include_router(system.router, prefix=api_prefix)
app.include_router(daily_menu.router, prefix=api_prefix)
app.include_router(calendar_router.router, prefix=api_prefix)

# Health and Root endpoints
@app.get("/")
@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "success": True,
        "status": "HEALTHY",
        "service": "Kathiyawadi Restaurant ERP Backend",
        "stack": "FastAPI + Python Socket.IO + PyMongo",
        "docs": "/docs"
    }

# Static Uploads directory
uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# Generated Posters directory
generated_posters_dir = Path(__file__).resolve().parent.parent / "generated_posters"
generated_posters_dir.mkdir(parents=True, exist_ok=True)
app.mount("/generated_posters", StaticFiles(directory=str(generated_posters_dir)), name="generated_posters")

# Frontend Single Page App (SPA) Support
admin_dist = Path(__file__).resolve().parent.parent / "admin" / "dist"
if admin_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(admin_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Allow API and socket routes to pass through
        if full_path.startswith("api") or full_path.startswith("socket.io") or full_path.startswith("uploads") or full_path == "health":
            raise HTTPException(status_code=404, detail={"success": False, "message": "Not found"})
        
        target = admin_dist / full_path
        if target.is_file():
            return FileResponse(target)
        return FileResponse(admin_dist / "index.html")

# Create Socket.IO ASGI application wrapping FastAPI
asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:asgi_app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
