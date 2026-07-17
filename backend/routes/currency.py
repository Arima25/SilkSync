from flask import Blueprint, request, jsonify
from services.currency import convert_currency

currency_bp = Blueprint("currency", __name__)


@currency_bp.route("/api/convert-currency", methods=["POST"])
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
