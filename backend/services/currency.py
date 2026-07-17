import http.client
import json
import os
from pathlib import Path
from dotenv import load_dotenv

CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent

load_dotenv(BACKEND_DIR / ".env")

# Documentation: https://fxratesapi.com/docs
API_HOST = "api.fxratesapi.com"

def convert_currency(from_currency: str, to_currency: str, amount: float):
    api_key = os.getenv("FXR_API_KEY")

    if not api_key:
        raise RuntimeError("FXR_API_KEY not set. Please set it in your .env file to use currency conversion.")
    
    conn = http.client.HTTPSConnection(API_HOST)

    endpoint = (
        f"/convert?"
        f"from={from_currency}&to={to_currency}"
        f"&amount={amount}"
        f"&format=json"
        f"&api_key={api_key}"
    )

    conn.request("GET", endpoint)
    res = conn.getresponse()

    if res.status != 200:
        raise Exception("Currency API request failed")
    
    data = json.loads(res.read().decode("utf-8"))

    if not data.get("success", False):
        raise Exception(data.get("error", "Conversion Failed"))
    
    return {
        "rate": data["info"]["rate"],
        "result": data["result"],
        "date": data["date"]
    }