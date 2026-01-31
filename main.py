from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

@app.route("/health")
def health():
    return {"status": "ok"}

@app.route("/auth/google", methods=["POST"])
def google_auth():
    data = request.get_json()
    access_token = data.get("accessToken")

    if not access_token:
        return jsonify({"error": "Missing access token"}), 400

    # Verify token with Google
    google_res = requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={
            "Authorization": f"Bearer {access_token}"
        }
    )

    if google_res.status_code != 200:
        return jsonify({"error": "Invalid Google token"}), 401

    user_info = google_res.json()

    print("Authenticated user:", user_info["email"])

    return jsonify({
        "email": user_info["email"],
        "name": user_info.get("name")
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
