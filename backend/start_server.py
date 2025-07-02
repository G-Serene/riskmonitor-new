"""
Script to start the Risk Dashboard API server
"""

import uvicorn
from risk_dashboard_api import app

if __name__ == "__main__":
    print("Starting Risk Dashboard API server...")
    print("Available endpoints:")
    print("- Dashboard data: http://localhost:8000/api/risk/dashboard")
    print("- Live news feed: http://localhost:8000/api/news/feed")
    print("- SSE Dashboard stream: http://localhost:8000/api/stream/dashboard")
    print("- SSE News stream: http://localhost:8000/api/stream/news")
    print("\nPress Ctrl+C to stop the server")
    
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8000, 
        reload=True,
        log_level="info"
    )
