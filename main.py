import os
import sys

# Add nested Restourant-main to Python path so backend can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.join(current_dir, "Restourant-main")
if project_dir not in sys.path:
    sys.path.insert(0, project_dir)

from backend.main import asgi_app, app as fastapi_app

# Expose 'app' as the ASGI application (FastAPI wrapped with Socket.IO)
# This satisfies Render's default command: 'uvicorn main:app --host 0.0.0.0 --port $PORT'
app = asgi_app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=False)
