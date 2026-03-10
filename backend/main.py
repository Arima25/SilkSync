from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from services.currency import convert_currency
from services.train_service import (
    search_stations, query_tickets, query_ticket_price,
    query_transfer, get_train_stops, get_train_no,
    get_current_time, get_nearest_stations, get_route,
)
from services.budget_service import calculate_trip_options
import asyncio
from datetime import datetime, timedelta

SEAT_NAME_MAP = {
    "硬座": "hard_seat",
    "二等座": "second_class",
    "硬卧": "hard_sleeper",
    "一等座": "first_class",
    "软卧": "soft_sleeper",
    "商务座": "business_class",

    # optional extra aliases
    "特等座": "business_class",
    "高级软卧": "soft_sleeper",
}

def _normalize_train_prices(price_data: dict) -> dict:
    """
    Extract a single dict of normalized seat_type -> float from MCP price response.
    Handles both top-level "prices" and "data" array.
    Converts Chinese seat names to the English keys used by budget_service.py.
    """
    out = {}

    if not price_data:
        return out

    def normalize_key(key: str) -> str:
        if not isinstance(key, str):
            return key
        return SEAT_NAME_MAP.get(key, key)

    # Top-level "prices"
    raw = price_data.get("prices") or {}
    if isinstance(raw, dict):
        for k, v in raw.items():
            try:
                n = float(v) if v is not None else None
                if n is not None and n > 0:
                    out[normalize_key(k)] = n
            except (TypeError, ValueError):
                continue

    # First row in "data"
    for row in price_data.get("data") or []:
        row_prices = row.get("prices") or {}
        if isinstance(row_prices, dict):
            for k, v in row_prices.items():
                try:
                    n = float(v) if v is not None else None
                    normalized_key = normalize_key(k)
                    if n is not None and n > 0 and normalized_key not in out:
                        out[normalized_key] = n
                except (TypeError, ValueError):
                    continue
        break

    return out
app = Flask(__name__)
CORS(app)

# In-memory storage for check-ins (in production, use a real database)
check_ins = {}
train_travelers = {}

@app.route('/')
def index():
    return render_template('index.html')

# Currency Exchange
@app.route("/api/convert-currency", methods=["POST"])
def convert_currency_api():
    data = request.get_json()

    from_currency = data.get("from")
    to_currency = data.get("to")
    amount = data.get("amount")

    if not from_currency or not to_currency or amount is None:
        return jsonify({"error": "Missing required fields"}), 400

    try:
        conversion = convert_currency(
            from_currency,
            to_currency,
            float(amount)
        )

        return jsonify({
            "from": from_currency,
            "to": to_currency,
            "amount": amount,
            "converted_amount": round(conversion["result"], 2),
            "rate": conversion["rate"],
            "date": conversion["date"]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===============================
# NEW ROUTE SEARCH + BUDGET ENGINE
# ===============================

@app.route("/api/trains/price_for_route", methods=["POST"])
async def price_for_route():
    """
    Get REAL train seat prices for a route using the first available day,
    then run the budget engine on those real seat prices.
    """
    try:
        data = request.json or {}
        origin = data.get("from") or data.get("origin")
        destination = data.get("to") or data.get("destination")
        user_budget = data.get("budget")
        days = data.get("days", 3)

        if not origin or not destination:
            return jsonify({"error": "Missing from/origin and to/destination"}), 400

        today = datetime.now().date()

        chosen_date = None
        chosen_train_code = None

        for day_offset in range(14):
            train_date = (today + timedelta(days=day_offset)).strftime("%Y-%m-%d")

            route_data = await get_route(origin, destination, train_date)
            if not route_data or "trains" not in route_data:
                continue

            trains = route_data.get("trains", [])
            if not trains:
                continue

            first_train = trains[0]
            chosen_train_code = first_train.get("train_code")
            chosen_date = train_date
            break

        if not chosen_date or not chosen_train_code:
            return jsonify({"error": "No available train prices found for this route"}), 404

        price_data = await query_ticket_price(
            origin,
            destination,
            chosen_date,
            chosen_train_code
        )

        train_prices_cny = _normalize_train_prices(price_data)
        train_prices = train_prices_cny

        budget_analysis = calculate_trip_options(
            train_prices,
            user_budget or 0,
            destination,
            days=int(days) if days is not None else 3
        )

        return jsonify({
            "budget_analysis": budget_analysis,
            "train_price_date": chosen_date
        })

    except Exception as e:
        print("ERROR in /api/trains/price_for_route:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/search_route", methods=["POST"])
def search_route():
    data = request.json

    from_station = data.get("from")
    to_station = data.get("to")
    date = data.get("date")
    user_budget = float(data.get("budget") or 0)

    if not from_station or not to_station or not date:
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        route_data = asyncio.run(get_route(from_station, to_station, date))

        trains = route_data.get("trains", [])
        if not trains:
            return jsonify({
                "route": route_data,
                "budget_analysis": None,
                "message": "No trains found for this route."
            })

        first_train = trains[0]
        train_code = first_train.get("train_code")

        price_data = asyncio.run(
            query_ticket_price(from_station, to_station, date, train_code)
        )

        train_prices = _normalize_train_prices(price_data)

        budget_analysis = calculate_trip_options(
            train_prices,
            user_budget,
            to_station
        )

        return jsonify({
            "route": route_data,
            "budget_analysis": budget_analysis
        })

    except Exception as e:
        print("ERROR in /search_route:", e)
        return jsonify({"error": str(e)}), 500
    
# Station Search
@app.route("/api/trains/stations/search", methods=["GET"])
def stations_search():
    q = request.args.get("q")
    if not q:
        return jsonify({"error": "Missing query parameter"}), 400
    try:
        result = asyncio.run(search_stations(q))
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Ticket Query
@app.route("/api/trains/tickets", methods=["GET"])
def tickets():
    from_station = request.args.get("from_station")
    to_station = request.args.get("to_station")
    date = request.args.get("train_date")

    if not from_station or not to_station or not date:
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        result = asyncio.run(query_tickets(from_station, to_station, date))
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Transfer query
@app.route("/api/trains/transfer", methods=["GET"])
def transfer():
    from_station = request.args.get("from_station")
    to_station = request.args.get("to_station")
    train_date = request.args.get("train_date")

    if not from_station or not to_station or not train_date:
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        result = asyncio.run(query_transfer(from_station, to_station, train_date))
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Train stops
@app.route("/api/trains/stops/<train_code>", methods=["GET"])
def train_stops(train_code):
    from_station = request.args.get("from_station")
    to_station = request.args.get("to_station")
    train_date = request.args.get("train_date")

    if not from_station or not to_station or not train_date:
        return jsonify({"error": "Missing required parameters: from_station, to_station, train_date"}), 400

    try:
        result = asyncio.run(get_train_stops(train_code, from_station, to_station, train_date))
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# China time
@app.route("/api/trains/current-time", methods=["GET"])
def current_time():
    try:
        result = asyncio.run(get_current_time())
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Ticket Pricing
@app.route("/api/trains/price", methods=["GET"])
def ticket_price():
    from_station = request.args.get("from_station")
    to_station = request.args.get("to_station")
    train_date = request.args.get("train_date")
    train_code = request.args.get("train_code")

    if not from_station or not to_station or not train_date:
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        result = asyncio.run(query_ticket_price(from_station, to_station, train_date, train_code))
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/trains/train-no", methods=["GET"])
def train_no():
    train_code = request.args.get("train_code")
    from_station = request.args.get("from_station")
    to_station = request.args.get("to_station")
    train_date = request.args.get("train_date")

    if not train_code or not from_station or not to_station or not train_date:
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        result = asyncio.run(get_train_no(train_code, from_station, to_station, train_date))
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Nearest Station
@app.route("/api/trains/nearest-stations", methods=["GET"])
def nearest_stations():
    city = request.args.get("city")

    if not city:
        return jsonify({"error": "Missing city parameter"}), 400

    try:
        return jsonify(asyncio.run(get_nearest_stations(city)))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Train Route
@app.route("/api/trains/route", methods=["GET"])
def route():
    from_station = request.args.get("from_station")
    to_station = request.args.get("to_station")
    train_date = request.args.get("train_date")

    if not from_station or not to_station or not train_date:
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        return jsonify(asyncio.run(get_route(from_station, to_station, train_date)))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)