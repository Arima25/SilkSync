# SilkSync

## Setup for MCP Server

The app requires two servers running simultaneously: the 12306 MCP server (fetches real train data on port 8000) and the Silksync backend (our API, on port 5001).

## First-Time Setup

### Install uv

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**Mac/Linux:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

After installing, uv will print a PATH instruction like this:
```
To add uv to your PATH, run:
    set Path=C:\Users\yourname\.local\bin;%Path%   (cmd)
```

Run whichever line matches your terminal. check that it worked.
```bash
uv --version
```


---

### Clone the MCP server

Clone this **outside** the SilkSync folder.
```bash
git clone https://github.com/drfccv/mcp-server-12306.git
cd mcp-server-12306
uv sync
uv run python scripts/update_stations.py
```

Make sure you do the last command since it is to download the national station database. It must be run before anything else or all queries will fail.

---

### Set up the SILKSYNC backend
```bash
cd SilkSync/backend
pip install -r requirement.txt
```

Add this to the .env file
```env
MCP_SERVER_URL=http://localhost:8000
```

---

## Running the Project

Open two terminals every time you work on the backend.

**Terminal 1 — MCP server:**
```bash
cd mcp-server-12306
uv run python scripts/start_server.py
```

**Terminal 2 — SILKSYNC backend:**
```bash
cd SilkSync/backend
python main.py
```

---

## Verify It's Working

With both servers running, open these in your browser:
```
http://localhost:8000/docs        — MCP server
http://localhost:5001/api/trains/stations/search?q=beijing   — station search
http://localhost:5001/api/trains/current-time                — current time
```

If station search returns a list of Beijing stations, everything is working.
