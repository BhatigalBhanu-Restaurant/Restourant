import os
import sys

# Ensure Restourant-main is in sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "Restourant-main"))
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    
    print("=" * 65)
    print("  Kathiyawadi Restaurant Management ERP (Root Launcher)")
    print(f"  Starting server on {host}:{port}")
    print("=" * 65)
    
    uvicorn.run(
        "backend.main:asgi_app",
        host=host,
        port=port,
        reload=False,
        log_level="info"
    )
