# Mickey's Chat 🐭

Mickey's Chat is a professional, high-performance, full-stack real-time messaging application inspired by WhatsApp and Discord. It features a modern, responsive **glassmorphic user interface**, real-time socket updates, custom animations, progressive web app (PWA) support, and local WebRTC audio/video call signaling.

---

## Technical Stack & Architecture

### Backend
- **Core**: Python FastAPI (Async ASGI web application)
- **Database**: SQLite (SQLAlchemy ORM with prepared queries)
- **Real-Time Integration**: Socket.IO (python-socketio ASGI server mounted inside FastAPI)
- **Security**: JWT Authentication (HS256) and direct password hashing (`bcrypt` library)
- **AI Assistant**: Intelligent mock bot with context matching ("Mickey AI")
- **Analytics**: Auto-calculates system data, user online peaks, and message statistics

### Frontend
- **Framework**: React.js (loaded via ES modules using CDN `esm.sh`)
- **Build Engine**: Babel Standalone (JSX parsed directly inside client browser, needing zero Node/npm setup)
- **Styling**: Modern, fluid, mobile-first Vanilla CSS featuring dark/light themes, translucent panels, and micro-animations
- **Calling**: WebRTC peer-to-peer signalling using Socket.IO
- **Charts**: Custom-drawn canvas charts for real-time analytics reports

---

## Directory Structure

```text
mickeys-chat/
├── README.md               # Setup and running instructions
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py       # Configuration settings
│   │   ├── database.py     # SQLite and SQLAlchemy session
│   │   ├── models.py       # SQLAlchemy ORM database models
│   │   ├── schemas.py      # Pydantic schemas
│   │   ├── auth.py         # JWT tokens & bcrypt passwords
│   │   ├── sockets.py      # Socket.IO handlers & WebRTC signaling
│   │   ├── ai_agent.py     # Mickey's AI Assistant logic
│   │   └── main.py         # Entry point mounting REST routers and Static files
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_api.py     # Integration test suite
│   ├── database.db         # SQLite file (auto-generated)
│   └── requirements.txt    # Python dependencies
└── frontend/
    ├── index.html          # HTML Template loading React, Babel & Fonts
    ├── index.css           # Glassmorphic CSS design tokens and layouts
    ├── manifest.json       # PWA manifest settings
    ├── sw.js               # Service Worker for offline asset caching
    └── src/
        └── App.jsx         # Complete React Single Page App logic
```

---

## Installation Guide (Local Development)

### Prerequisites
- Python 3.10+ (tested successfully on Python 3.13)
- Modern web browser (Chrome, Edge, or Firefox)

### Step-by-Step Setup

1. **Clone or Navigate to the Workspace**:
   Ensure you set `C:/Users/Admin/.gemini/antigravity/scratch/mickeys-chat` as your active directory.

2. **Set Up Python Virtual Environment**:
   ```powershell
   cd backend
   python -m venv .venv
   ```

3. **Activate Environment and Install Dependencies**:
   ```powershell
   # Windows PowerShell
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

4. **Verify Installations**:
   Run the automated API test suite using pytest:
   ```powershell
   pytest
   ```

---

## Running Guide

To run both the backend API and the frontend application on a **single port (8000)**, start the FastAPI server:

```powershell
# Run from the 'backend/' folder:
.\.venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000
```

Open your web browser and navigate to:
👉 **[http://localhost:8000](http://localhost:8000)**

- Open two separate browser tabs (or use private browsing windows) to register two accounts.
- Send friend requests from the **Friends** tab, accept them, and start a real-time messaging thread or make a WebRTC audio/video call!

---

## Deployment Guide (Production Setup)

For staging or production environments, we recommend the following enhancements:

### 1. Database Upgrade
For high-concurrency production deployments, switch from SQLite to **PostgreSQL**.
Modify the `DATABASE_URL` setting in `backend/app/config.py` (or load it via environment variables):
```env
DATABASE_URL=postgresql://user:password@host:port/database_name
```

### 2. High-Performance ASGI Server (Gunicorn + Uvicorn)
For production process management, run the app using `gunicorn` with `uvicorn` workers:
```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000
```

### 3. Nginx Reverse Proxy & SSL Configuration
Configure Nginx as a reverse proxy to handle SSL termination, forward static files, and correctly pass WebSocket headers. Below is an example server configuration:

```nginx
server {
    listen 80;
    server_name mickeyschat.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mickeyschat.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/mickeyschat.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mickeyschat.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Crucial configurations for Socket.IO WebSockets routing
    location /socket.io/ {
        proxy_pass http://127.0.0.1:8000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 4. Horizontal WebSockets Scaling (Redis Adapter)
If deploying behind a load balancer with multiple backend nodes, Socket.IO needs a shared pub/sub backend to coordinate rooms and messages. Update your backend dependencies to include `redis` and configure `python-socketio` to use the Redis Manager:
```python
# app/sockets.py
mgr = socketio.AsyncRedisManager('redis://localhost:6379/0')
sio = socketio.AsyncServer(async_mode='asgi', client_manager=mgr)
```
