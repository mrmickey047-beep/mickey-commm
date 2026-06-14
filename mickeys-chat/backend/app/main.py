import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import socketio

from app.config import settings
from app.database import engine, Base
from app.routes import router as api_router
from app.sockets import sio

# Initialize DB tables on startup (SQLite)
Base.metadata.create_all(bind=engine)

# Create FastAPI app
fastapi_app = FastAPI(
    title="Mickey's Chat API",
    description="REST API for Mickey's Chat with JWT authentication and file sharing",
    version="1.0"
)

# Set up CORS middleware
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory is mounted to serve attachments
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
fastapi_app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include REST API routes
fastapi_app.include_router(api_router, prefix="/api")

# Resolve frontend directory dynamically relative to this file's folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")
os.makedirs(FRONTEND_DIR, exist_ok=True)

# Mount frontend static files at root
fastapi_app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

# Wrap the FastAPI app with the ASGI Socket.IO server
# Clients can connect to http://localhost:8000/socket.io/
app = socketio.ASGIApp(
    sio,
    other_asgi_app=fastapi_app,
    socketio_path="socket.io"
)

@sio.event
async def hello(sid):
    print(f"hello event from sid: {sid}")
