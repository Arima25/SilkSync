from flask import Flask, render_template, request, jsonify
from services.currency import convert_currency
from services.train_service import (
    search_stations, query_tickets, query_ticket_price,
    query_transfer, get_train_stops, get_train_no,
    get_current_time, get_nearest_stations, get_route
)
import asyncio

app = Flask(__name__)

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

# Station Search (e.g. GET /api/trains/stations/search?q=beijing)
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

# Ticket Query (e.g. GET /api/trains/tickets?from_station=北京&to_station=上海&train_date=2026-03-15)
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
    
# Transfer query (e.g. GET /api/trains/transfer?from_station=成都&to_station=西宁&train_date=2026-03-15)
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


# Train stops (e.g. GET /api/trains/stops/G1)
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

# China time (e.g. GET /api/trains/current-time)
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
    train_code = request.args.get("train_code")  # optional
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

# Nearest Station (e.g. /api/trains/nearest-stations?city=Beijing)
@app.route("/api/trains/nearest-stations", methods=["GET"])
def nearest_stations():
    city = request.args.get("city")
    if not city:
        return jsonify({"error": "Missing city parameter"}), 400
    try:
        return jsonify(asyncio.run(get_nearest_stations(city)))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Train Route (e.g.)
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
