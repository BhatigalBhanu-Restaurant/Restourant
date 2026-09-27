import os
import sys
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    
    print("=" * 65)
    print("  Kathiyawadi Restaurant Management ERP (Full Python Server)")
    print(f"  Unified Web Portal: http://localhost:{port}")
    print(f"  POS Terminal:       http://localhost:{port}/pos")
    print(f"  Kitchen Display:    http://localhost:{port}/kitchen")
    print(f"  Function Locker:    http://localhost:{port}/functions")
    print(f"  API Interactive:    http://localhost:{port}/docs")
    print(f"  Health Check:       http://localhost:{port}/health")
    print("=" * 65)
    
    uvicorn.run(
        "backend.main:asgi_app",
        host=host,
        port=port,
        reload=False,
        log_level="info"
    )
