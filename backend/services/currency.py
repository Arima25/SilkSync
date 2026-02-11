import http.client
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Documentation: https://fxratesapi.com/docs
API_HOST = "api.fxratesapi.com"
API_KEY = os.getenv("FXR_API_KEY")

if not API_KEY:
    raise RuntimeError("FXR_API_KEY not set")

def convert_currency(from_currency: str, to_currency: str, amount: float):
    conn = http.client.HTTPSConnection(API_HOST)

    endpoint = (
        f"/convert?"
        f"from={from_currency}&to={to_currency}"
        f"&amount={amount}"
        f"&format=json"
        f"&api_key={API_KEY}"
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