# SilkSync

SilkSync is a smart travel planning app for China. It helps users plan trips creating AI itinerary generation, getting real-time 12306 train data, and map-based route visualization. Users can set an origin and destination, compare train options, view station by station routes, and estimate trip costs with currency conversion support.

It is designed for travelers who want a fast, mobile first way to organize transportation and trip flow in one place.

---

## Architecture

This repo uses **3 running processes** during development:

1. **12306 MCP server** (external repo) — default `:8000`
2. **SilkSync backend (Flask)** — default `:5001`
3. **SilkSync mobile app (Expo)**

---

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **Git**
- **uv** (for MCP server)
- Android Studio emulator or physical device (recommended for Android testing)

---

## 1) Clone SilkSync

```bash
git clone <your-silksync-repo-url>
cd SilkSync
```

---

## 2) Set up MCP server (first time)

> Clone this **outside** SilkSync.

```bash
cd /Users/<your-user>/Desktop
git clone https://github.com/drfccv/mcp-server-12306.git
cd mcp-server-12306
```

Install `uv` (macOS/Linux):
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

If `uv` command is not found:
```bash
source "$HOME/.local/bin/env"
```

Install deps + station database:
```bash
uv sync
uv run python scripts/update_stations.py
```

---

## 3) Set up SilkSync backend

```bash
cd /Users/<your-user>/Desktop/SilkSync/backend
pip install -r requirement.txt
```

Create/edit `.env` in `backend/`:
```env
MCP_SERVER_URL=http://127.0.0.1:8000
```

---

## 4) Set up mobile app

```bash
cd /Users/<your-user>/Desktop/SilkSync/mobile
npm install
```

Create/edit `.env` in `mobile/`:

```env
# Mapbox
EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN=your_mapbox_token

# AMap SDK keys (native)
EXPO_PUBLIC_AMAP_ANDROID_API_KEY=your_amap_android_key
EXPO_PUBLIC_AMAP_IOS_API_KEY=your_amap_ios_key

# AMap Web API key (geocoding/reverse geocode)
EXPO_PUBLIC_AMAP_WEB_API_KEY=your_amap_web_key

# Backend URL:
# Android emulator should use 10.0.2.2
EXPO_PUBLIC_BACKEND_URL=http://10.0.2.2:5001
# iOS simulator/mac can use:
# EXPO_PUBLIC_BACKEND_URL=http://127.0.0.1:5001
```

---

## 5) Run the project (every time)

Open **3 terminals**.

### Terminal A — MCP server
```bash
cd /Users/<your-user>/Desktop/mcp-server-12306
uv run python scripts/start_server.py
```

### Terminal B — SilkSync backend
```bash
cd /Users/<your-user>/Desktop/SilkSync/backend
python -u main.py
```

### Terminal C — Mobile app
```bash
cd /Users/<your-user>/Desktop/SilkSync/mobile
npx expo start -c
```

Then press:
- `a` for Android emulator
- or scan QR for device

---

## 6) Quick health checks

Open in browser:

- MCP docs: `http://127.0.0.1:8000/docs`
- MCP health: `http://127.0.0.1:8000/health`
- Backend time: `http://127.0.0.1:5001/api/trains/current-time`
- Station search: `http://127.0.0.1:5001/api/trains/stations/search?q=beijing`

If station search returns data, train integration is connected.

---

## Common issues

### 1) Mobile cannot reach backend
- Android emulator must use:
  - `EXPO_PUBLIC_BACKEND_URL=http://10.0.2.2:5001`
- Restart Expo after `.env` change:
```bash
npx expo start -c
```

### 2) “Current location unavailable”
- Enable location services in emulator/device
- Set a mock location in emulator controls

### 3) No train routes returned
- Confirm both MCP (`:8000`) and backend (`:5001`) are running
- Test route API directly:
```bash
curl "http://127.0.0.1:5001/api/trains/route?from_station=北京&to_station=上海&train_date=2026-03-10"
```

### 4) Port already in use
```bash
lsof -i :8000
lsof -i :5001
kill -9 <PID>
```

---

## Test command (backend)

```bash
cd /Users/<your-user>/Desktop/SilkSync/backend
pytest
```

---

## Release note

This MVP includes:
- location detection
- itinerary generation flow
- train search with real 12306-backed data
- map route rendering on AMap
- currency display support
