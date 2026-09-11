# 📡 Faculty Signal

**A ridiculously over-engineered superhero faculty radar built for a college hackathon.**

Faculty Signal is a cinematic, consent-based "malware-style" faculty tracking system. It looks like a suspicious piece of tracking malware has activated — but under the hood, it's a completely normal web application that requires explicit permission for everything.

> ⚠️ **No actual malware.** No hidden processes. No OS persistence. No silent data collection. We promise.

---

## 🎯 How It Works

1. **Tracker operator** creates a session, getting a code like `FS-7K29`
2. **Faculty member** opens a link/PDF containing the session URL
3. Faculty sees a "suspicious" terminal animation, then explicitly grants location permission
4. Tracker dashboard shows a cinematic **radar HUD** with:
   - Animated directional arrow
   - Approximate distance (bucketed, never exact GPS)
   - Cardinal direction
   - Signal strength & movement status
   - Proximity alerts with funny messages

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+** with pip
- **Node.js 18+** with npm

### Backend

```bash
cd backend
pip install -r requirements.txt
python server.py
```

The API server starts at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` with API proxy to the backend.

### Demo Mode

Click **▶ DEMO MODE** on the tracker page to simulate target movement without needing a real faculty member. Perfect for judging demos!

Available simulation patterns:
- **CARDINAL_SWEEP** — Target sweeps through N → NE → E → SE directions
- **ORBIT** — Target circles around tracker at varying distance
- **APPROACH** — Target approaches then retreats
- **WANDER** — Random wandering movement

---

## 📱 Pages

| Route | Purpose |
|---|---|
| `/` | Landing / activation screen with terminal boot animation |
| `/share/:sessionId` | Faculty location-sharing page with permission flow |
| `/tracker` | Cinematic tracker dashboard (the centerpiece!) |
| `/session-ended` | Funny cleanup/shutdown screen |

---

## 🏗️ Architecture

```
Faculty Browser → Explicit Location Permission → REST API → In-Memory Session
                                                                    ↓
Tracker Dashboard ← WebSocket Live Updates ← Backend Session Store
                                                                    ↓
                    Distance + Bearing Calculation → Animated Arrow
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v4, Framer Motion |
| Backend | Python FastAPI with WebSocket |
| Storage | In-memory (dict) — no database |
| Location | Browser Geolocation API |
| Orientation | Device Orientation API (compass) |

---

## 🔒 Privacy

This is a **consent-based hackathon demo**. By design:

- ✅ Location only collected after **explicit browser permission**
- ✅ Approximate coordinates (rounded to ~10m precision)
- ✅ Distance shown in **buckets** (never exact GPS)
- ✅ Prominent **STOP** button on faculty device
- ✅ Auto-expires after configurable timeout (default 30 min)
- ✅ All data deleted when session ends
- ✅ No persistent storage / database
- ❌ No silent location collection
- ❌ No OS-level malware or persistence
- ❌ No hidden processes
- ❌ No PDF exploits

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and adjust:

### Backend (`backend/.env`)

```env
SESSION_TIMEOUT_MINUTES=30
HOST=0.0.0.0
PORT=8000
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

---

## 😄 Easter Eggs

The tracker cycles through context-aware messages like:

- `TARGET ACQUIRED`
- `DO NOT MAKE EYE CONTACT`
- `ATTENDANCE THREAT LEVEL: HIGH`
- `HOD DETECTED`
- `SIGNAL LOST — THEY'RE HIDING`
- `TARGET IS ESCAPING`

---

## 📂 Project Structure

```
faculty-signal/
├── backend/
│   ├── server.py          # FastAPI server (REST + WebSocket)
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Backend config template
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── RadarHUD.jsx
│   │   │   ├── DirectionalArrow.jsx
│   │   │   ├── TargetInfo.jsx
│   │   │   ├── ProximityAlert.jsx
│   │   │   ├── StatusMessages.jsx
│   │   │   └── TerminalText.jsx
│   │   ├── pages/         # Route pages
│   │   │   ├── LandingPage.jsx
│   │   │   ├── SharePage.jsx
│   │   │   ├── TrackerPage.jsx
│   │   │   └── SessionEndedPage.jsx
│   │   ├── hooks/         # Custom React hooks
│   │   │   └── useTracking.js
│   │   ├── utils/         # Geo math & demo simulator
│   │   │   ├── geo.js
│   │   │   └── demo.js
│   │   └── assets/        # Generated professor avatar
│   ├── .env               # Frontend config
│   └── vite.config.js     # Vite + Tailwind + proxy
└── README.md
```

---

## 🏆 Built for Hackathon

This project is intentionally over-the-top. The goal is to make judges laugh while demonstrating real engineering:

- Real-time WebSocket communication
- Haversine distance & bearing calculations
- Device orientation API (compass)
- Canvas-based radar rendering
- Framer Motion spring animations
- Responsive design (mobile + desktop)
- Session management with auto-cleanup

**Faculty Signal™ — For Educational Purposes Only.**
