"""
Faculty Signal — Backend Server
A consent-based, hackathon-style faculty tracking system.
All session data is in-memory and auto-expires.
"""

from __future__ import annotations

import os
import random
import string
import time
import math
import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, List


from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# --- Config ---
SESSION_TIMEOUT_MINUTES = int(os.getenv("SESSION_TIMEOUT_MINUTES", "30"))
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# --- App ---
app = FastAPI(title="Faculty Signal", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Hackathon: allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-Memory Storage ---
sessions: Dict = {}
# Maps session_id -> list of connected WebSocket clients
tracker_connections: Dict[str, List[WebSocket]] = {}


# --- Models ---
class CreateSessionRequest(BaseModel):
    target_name: str = "SARJU SIR"
    timeout_minutes: Optional[int] = None


class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    heading: Optional[float] = None
    speed: Optional[float] = None


class JoinSessionRequest(BaseModel):
    pass  # Just needs to hit the endpoint


# --- Helpers ---
def generate_session_id() -> str:
    """Generate a session ID like FS-7K29"""
    chars = string.ascii_uppercase + string.digits
    code = ''.join(random.choices(chars, k=4))
    return f"FS-{code}"


def round_location(lat: float, lon: float, precision: int = 4) -> tuple[float, float]:
    """Round coordinates to ~10m precision (4 decimal places)"""
    return round(lat, precision), round(lon, precision)


def estimate_movement(session: dict) -> str:
    """Estimate if target is moving based on recent locations"""
    history = session.get("location_history", [])
    if len(history) < 2:
        return "UNKNOWN"

    prev = history[-2]
    curr = history[-1]

    # Simple distance check between last two points
    dlat = curr["latitude"] - prev["latitude"]
    dlon = curr["longitude"] - prev["longitude"]
    # Rough distance in meters
    dist = math.sqrt(dlat**2 + dlon**2) * 111000

    if dist > 2:  # More than ~2 meters
        return "MOVING"
    return "STATIONARY"


def calculate_signal_strength(last_update_time: float) -> int:
    """Calculate signal strength based on recency of last update"""
    elapsed = time.time() - last_update_time
    if elapsed < 3:
        return random.randint(85, 99)
    elif elapsed < 6:
        return random.randint(65, 84)
    elif elapsed < 10:
        return random.randint(40, 64)
    elif elapsed < 20:
        return random.randint(15, 39)
    else:
        return random.randint(1, 14)


# --- API Routes ---

@app.get("/api/health")
async def health():
    return {"status": "operational", "message": "FACULTY SIGNAL SYSTEMS ONLINE"}


@app.post("/api/session")
async def create_session(req: CreateSessionRequest):
    """Create a new tracking session"""
    session_id = generate_session_id()
    # Ensure unique
    while session_id in sessions:
        session_id = generate_session_id()

    timeout = req.timeout_minutes or SESSION_TIMEOUT_MINUTES
    now = datetime.utcnow()

    sessions[session_id] = {
        "id": session_id,
        "target_name": req.target_name,
        "active": True,
        "faculty_joined": False,
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(minutes=timeout)).isoformat(),
        "timeout_minutes": timeout,
        "target_location": None,
        "last_update": None,
        "location_history": [],  # Keep only last 5 for movement detection
        "movement_status": "UNKNOWN",
        "signal_strength": 0,
    }

    tracker_connections[session_id] = []

    return {
        "session_id": session_id,
        "target_name": req.target_name,
        "expires_at": sessions[session_id]["expires_at"],
        "timeout_minutes": timeout,
        "share_path": f"/share/{session_id}",
    }


@app.get("/api/session/{session_id}")
async def get_session(session_id: str):
    """Get session info"""
    session_id = session_id.upper()
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="SESSION NOT FOUND — TARGET HAS VANISHED")

    session = sessions[session_id]

    # Check expiry
    if datetime.utcnow() > datetime.fromisoformat(session["expires_at"]):
        session["active"] = False

    return {
        "id": session["id"],
        "target_name": session["target_name"],
        "active": session["active"],
        "faculty_joined": session["faculty_joined"],
        "created_at": session["created_at"],
        "expires_at": session["expires_at"],
        "timeout_minutes": session["timeout_minutes"],
        "has_location": session["target_location"] is not None,
        "movement_status": session["movement_status"],
        "signal_strength": session["signal_strength"],
        "last_update": session["last_update"],
    }


@app.post("/api/session/{session_id}/join")
async def join_session(session_id: str):
    """Faculty joins a session"""
    session_id = session_id.upper()
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="SESSION NOT FOUND")

    session = sessions[session_id]
    if not session["active"]:
        raise HTTPException(status_code=410, detail="SESSION EXPIRED — THE WINDOW HAS CLOSED")

    if datetime.utcnow() > datetime.fromisoformat(session["expires_at"]):
        session["active"] = False
        raise HTTPException(status_code=410, detail="SESSION EXPIRED")

    session["faculty_joined"] = True

    # Notify trackers
    await broadcast_to_trackers(session_id, {
        "type": "faculty_joined",
        "target_name": session["target_name"],
        "message": "TARGET HAS ENTERED THE NETWORK"
    })

    return {
        "status": "joined",
        "target_name": session["target_name"],
        "expires_at": session["expires_at"],
        "message": "SIGNAL LINK ESTABLISHED"
    }


@app.post("/api/session/{session_id}/location")
async def update_location(session_id: str, loc: LocationUpdate):
    """Faculty sends their location"""
    session_id = session_id.upper()
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="SESSION NOT FOUND")

    session = sessions[session_id]
    if not session["active"]:
        raise HTTPException(status_code=410, detail="SESSION EXPIRED")

    if datetime.utcnow() > datetime.fromisoformat(session["expires_at"]):
        session["active"] = False
        raise HTTPException(status_code=410, detail="SESSION EXPIRED")

    # Round location for privacy
    rounded_lat, rounded_lon = round_location(loc.latitude, loc.longitude)

    now = time.time()
    location_data = {
        "latitude": rounded_lat,
        "longitude": rounded_lon,
        "accuracy": loc.accuracy,
        "heading": loc.heading,
        "speed": loc.speed,
        "timestamp": now,
    }

    session["target_location"] = location_data
    session["last_update"] = datetime.utcnow().isoformat()

    # Keep last 5 locations for movement detection
    session["location_history"].append(location_data)
    if len(session["location_history"]) > 5:
        session["location_history"] = session["location_history"][-5:]

    session["movement_status"] = estimate_movement(session)
    session["signal_strength"] = calculate_signal_strength(now)

    # Broadcast to connected trackers
    await broadcast_to_trackers(session_id, {
        "type": "location_update",
        "location": {
            "latitude": rounded_lat,
            "longitude": rounded_lon,
            "accuracy": loc.accuracy,
        },
        "movement_status": session["movement_status"],
        "signal_strength": session["signal_strength"],
        "last_update": session["last_update"],
        "target_name": session["target_name"],
    })

    return {"status": "received", "message": "SIGNAL TRANSMITTED"}


@app.delete("/api/session/{session_id}")
async def terminate_session(session_id: str):
    """Terminate a session and clean up all data"""
    session_id = session_id.upper()
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="SESSION NOT FOUND")

    # Notify trackers
    await broadcast_to_trackers(session_id, {
        "type": "session_terminated",
        "message": "TARGET SIGNAL LOST — SESSION TERMINATED"
    })

    # Close all WebSocket connections
    if session_id in tracker_connections:
        for ws in tracker_connections[session_id]:
            try:
                await ws.close()
            except Exception:
                pass
        del tracker_connections[session_id]

    # Delete session data
    del sessions[session_id]

    return {"status": "terminated", "message": "ALL TRACKING DATA PURGED"}


@app.post("/api/session/{session_id}/stop-sharing")
async def stop_sharing(session_id: str):
    """Faculty stops sharing location"""
    session_id = session_id.upper()
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="SESSION NOT FOUND")

    session = sessions[session_id]
    session["target_location"] = None
    session["signal_strength"] = 0
    session["movement_status"] = "OFFLINE"
    session["faculty_joined"] = False

    await broadcast_to_trackers(session_id, {
        "type": "sharing_stopped",
        "message": "TARGET HAS GONE DARK — LOCATION SHARING STOPPED"
    })

    return {"status": "stopped", "message": "LOCATION SHARING TERMINATED"}


# --- WebSocket ---

async def broadcast_to_trackers(session_id: str, data: dict):
    """Send data to all connected tracker clients for a session"""
    if session_id not in tracker_connections:
        return

    dead_connections = []
    for ws in tracker_connections[session_id]:
        try:
            await ws.send_json(data)
        except Exception:
            dead_connections.append(ws)

    # Clean up dead connections
    for ws in dead_connections:
        tracker_connections[session_id].remove(ws)


@app.websocket("/ws/tracker/{session_id}")
async def tracker_websocket(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for tracker dashboard"""
    session_id = session_id.upper()

    if session_id not in sessions:
        await websocket.close(code=4004, reason="SESSION NOT FOUND")
        return

    await websocket.accept()

    if session_id not in tracker_connections:
        tracker_connections[session_id] = []
    tracker_connections[session_id].append(websocket)

    session = sessions[session_id]

    # Send initial state
    initial_data = {
        "type": "connected",
        "session_id": session_id,
        "target_name": session["target_name"],
        "active": session["active"],
        "faculty_joined": session["faculty_joined"],
        "expires_at": session["expires_at"],
        "message": "TRACKER LINK ESTABLISHED"
    }

    if session["target_location"]:
        initial_data["location"] = {
            "latitude": session["target_location"]["latitude"],
            "longitude": session["target_location"]["longitude"],
            "accuracy": session["target_location"].get("accuracy"),
        }
        initial_data["movement_status"] = session["movement_status"]
        initial_data["signal_strength"] = session["signal_strength"]
        initial_data["last_update"] = session["last_update"]

    await websocket.send_json(initial_data)

    try:
        while True:
            # Keep connection alive, listen for pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})

                # Also send current session state as heartbeat
                if session_id in sessions:
                    s = sessions[session_id]
                    # Check expiry
                    if datetime.utcnow() > datetime.fromisoformat(s["expires_at"]):
                        s["active"] = False
                        await websocket.send_json({
                            "type": "session_expired",
                            "message": "SESSION TIME LIMIT REACHED — TRACKING TERMINATED"
                        })

                    if s["target_location"]:
                        s["signal_strength"] = calculate_signal_strength(
                            s["target_location"]["timestamp"]
                        )
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if session_id in tracker_connections and websocket in tracker_connections[session_id]:
            tracker_connections[session_id].remove(websocket)


# --- Background Task: Session Cleanup ---

@app.on_event("startup")
async def start_cleanup_task():
    asyncio.create_task(cleanup_expired_sessions())


async def cleanup_expired_sessions():
    """Periodically clean up expired sessions"""
    while True:
        await asyncio.sleep(60)  # Check every minute
        now = datetime.utcnow()
        expired = []
        for sid, session in sessions.items():
            if now > datetime.fromisoformat(session["expires_at"]):
                expired.append(sid)

        for sid in expired:
            # Notify trackers
            await broadcast_to_trackers(sid, {
                "type": "session_expired",
                "message": "SESSION EXPIRED — ALL DATA PURGED"
            })
            # Close connections
            if sid in tracker_connections:
                for ws in tracker_connections[sid]:
                    try:
                        await ws.close()
                    except Exception:
                        pass
                del tracker_connections[sid]
            del sessions[sid]


# --- Run ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host=HOST, port=PORT, reload=True)
