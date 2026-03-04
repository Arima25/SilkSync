import httpx
import os
import json
from dotenv import load_dotenv
from typing import Optional
from services.translations import bilingual_station, bilingual_seats

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
                "mcp-session-id": session_id or ""
            }
        )
        #print("STATUS:", res.status_code)
        #print("RESPONSE:", res.text)
        res.raise_for_status()
        return res.json()
    
def parse_response(raw: dict) -> dict:
    try:
        return json.loads(raw["result"]["content"][0]["text"])
    except Exception:
        return {"success": False, "error": "Failed to parse MCP response"}

# Filters out trains with no schedule data (sold out or unavailable)
def filter_valid_trains(trains: list) -> list:
    return [t for t in trains if t.get("start_time") != "24:00" and t.get("duration") != "99:59"]

def format_train(train: dict) -> dict:
    return {
        "train_code": train.get("train_no"),
        "from_station": bilingual_station(train.get("from_station", "")),
        "to_station": bilingual_station(train.get("to_station", "")),
        "departure": train.get("start_time"),
        "arrival": train.get("arrive_time"),
        "duration": train.get("duration"),
        "seats": bilingual_seats(train.get("seats", {}))
    }

def format_transfer(transfer: dict) -> dict:
    return {
        "middle_station": bilingual_station(transfer.get("middle_station", "")),
        "wait_time": transfer.get("wait_time"),
        "total_duration": transfer.get("total_duration"),
        "legs": [format_train(seg) for seg in transfer.get("segments", [])]
    }

# Search Stations by name, pinyin or abbreviated pinyin (e.g. "bj" for Beijing)
async def search_stations(query: str, limit: int = 10):
    raw = await call_mcp_tool("search-stations", {"query": query, "limit": limit})
    return parse_response(raw)

# Returns all available trains between two stations on a given date
async def query_tickets(from_station: str, to_station: str, train_date: str):
    raw = await call_mcp_tool("query-tickets", {
        "from_station": from_station,
        "to_station": to_station,
        "train_date": train_date
    })
    return parse_response(raw)

# Return Ticket Prices
async def query_ticket_price(from_station: str, to_station: str, train_date: str, train_code: Optional[str] = None):
    args = {"from_station": from_station, "to_station": to_station, "train_date": train_date}
    if train_code:
        args["train_code"] = train_code
    raw = await call_mcp_tool("query-ticket-price", args)
    return parse_response(raw)

# Finds journeys that require one transfer when no direct train exists
async def query_transfer(from_station: str, to_station: str, train_date: str, middle_station: Optional[str] = None):
    args = {"from_station": from_station, "to_station": to_station, "train_date": train_date}
    if middle_station:
        args["middle_station"] = middle_station
    raw = await call_mcp_tool("query-transfer", args)
    return parse_response(raw)

# Returns every stop a specific train makes, with arrival and departure times.
async def get_train_stops(train_no: str, from_station: str, to_station: str, train_date: str):
    raw = await call_mcp_tool("get-train-route-stations", {
        "train_no": train_no,
        "from_station": from_station,
        "to_station": to_station,
        "train_date": train_date
    })
    return parse_response(raw)

# Converts a human readbable train code (e.g. G1) to interal train_no for get_train_stops
async def get_train_no(train_code: str, from_station: str, to_station: str, train_date: str):
    raw = await call_mcp_tool("get-train-no-by-train-code", {
        "train_code": train_code,
        "from_station": from_station,
        "to_station": to_station,
        "train_date": train_date
    })
    return parse_response(raw)

# Returns the current date and time in China timezone
async def get_current_time():
    raw = await call_mcp_tool("get-current-time", {})
    return parse_response(raw)

# Used to convert user's current map position into list of stations (goes from nearest to furthest)
async def get_nearest_stations(city_name: str):
    raw = await call_mcp_tool("search-stations", {"query": city_name, "limit": 5})
    return parse_response(raw)

# Routing function from nearest station to destination
async def get_route(from_station: str, to_station: str, train_date: str):
    direct_data = await query_tickets(from_station, to_station, train_date)

    if direct_data.get("success") and direct_data.get("trains"):
        valid_trains = filter_valid_trains(direct_data["trains"])
        if valid_trains:
            return {
                "type": "direct",
                "from": bilingual_station(from_station),
                "to": bilingual_station(to_station),
                "date": train_date,
                "count": len(valid_trains),
                "trains": [format_train(t) for t in valid_trains]
            }

    transfer_data = await query_transfer(from_station, to_station, train_date)
    return {
        "type": "transfer",
        "from": bilingual_station(from_station),
        "to": bilingual_station(to_station),
        "date": train_date,
        "count": len(transfer_data.get("transfers", [])),
        "options": [format_transfer(t) for t in transfer_data.get("transfers", [])]
    }