import httpx
import os
from dotenv import load_dotenv
from typing import Optional

load_dotenv()
MCP_BASE_URL = os.getenv("MCP_SERVER_URL", "http://localhost:8000")

# Opens a new session with the MCP server
async def get_session_id() -> str:
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            f"{MCP_BASE_URL}/mcp",
            json={
                "jsonrpc": "2.0",
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {"name": "silksync", "version": "1.0.0"}
                },
                "id": 0
            },
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream"
            }
        )
        
        # Debugging Code
        #print("SESSION STATUS:", res.status_code)
        #print("SESSION RESPONSE:", res.text)
        session_id = res.headers.get("mcp-session-id")
        return session_id

# Function to call any tool on the MCP server
async def call_mcp_tool(tool_name: str, arguments: dict):
    session_id = await get_session_id()
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            f"{MCP_BASE_URL}/mcp",
            json={
                "jsonrpc": "2.0",
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": arguments
                },
                "id": 1
            },
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream",
                "mcp-session-id": session_id
            }
        )
        print("STATUS:", res.status_code)
        print("RESPONSE:", res.text)
        res.raise_for_status()
        return res.json()

# Search Stations by name, pinyin or abbreviated pinyin (e.g. "bj" for Beijing)
async def search_stations(query: str, limit: int = 10):
    return await call_mcp_tool("search-stations", {"query": query, "limit": limit})

# Returns all available trains between two stations on a given date
async def query_tickets(from_station: str, to_station: str, train_date: str):
    return await call_mcp_tool("query-tickets", {
        "from_station": from_station,
        "to_station": to_station,
        "train_date": train_date
    })

# Return Ticket Prices
async def query_ticket_price(from_station: str, to_station: str, train_date: str, train_code: Optional[str] = None):
    args = {"from_station": from_station, "to_station": to_station, "train_date": train_date}
    if train_code:
        args["train_code"] = train_code
    return await call_mcp_tool("query-ticket-price", args)

# Finds journeys that require one transfer when no direct train exists
async def query_transfer(from_station: str, to_station: str, train_date: str, middle_station: Optional[str] = None):
    args = {"from_station": from_station, "to_station": to_station, "train_date": train_date}
    if middle_station:
        args["middle_station"] = middle_station
    return await call_mcp_tool("query-transfer", args)

# Returns every stop a specific train makes, with arrival and departure times.
async def get_train_stops(train_no: str, from_station: str, to_station: str, train_date: str):
    return await call_mcp_tool("get-train-route-stations", {
        "train_no": train_no,
        "from_station": from_station,
        "to_station": to_station,
        "train_date": train_date
    })

# Converts a human readbable train code (e.g. G1) to interal train_no for get_train_stops
async def get_train_no(train_code: str, from_station: str, to_station: str, train_date: str):
    return await call_mcp_tool("get-train-no-by-train-code", {
        "train_code": train_code,
        "from_station": from_station,
        "to_station": to_station,
        "train_date": train_date
    })

# Returns the current date and time in China timezone
async def get_current_time():
    return await call_mcp_tool("get-current-time", {})