import logging

from flask import Blueprint, request, jsonify

from extensions import db
from models import TrainJourney, Traveler

logger = logging.getLogger(__name__)

checkin_bp = Blueprint("checkin", __name__)


@checkin_bp.route("/api/check-in", methods=["POST"])
def check_in():
    """
    Check in a user to a specific train journey.
    Creates or joins an existing journey for that train and date.
    """
    try:
        data = request.get_json()

        user_id = data.get("userId")
        user_name = data.get("userName")
        user_photo = data.get("userPhoto")
        train_number = data.get("trainNumber")
        departure_date = data.get("departureDate")
        departure_station = data.get("departureStation")
        arrival_station = data.get("arrivalStation")
        social_intent = data.get("socialIntent")
        coach = data.get("coach")

        if not all([user_id, user_name, train_number, departure_date, departure_station, arrival_station]):
            return jsonify({"error": "Missing required fields"}), 400

        # Journey ID format: trainNumber-departureDate
        journey_id = f"{train_number}-{departure_date}"

        journey = db.session.get(TrainJourney, journey_id)
        if journey is None:
            journey = TrainJourney(
                id=journey_id,
                train_number=train_number,
                departure_date=departure_date,
                departure_station=departure_station,
                arrival_station=arrival_station,
            )
            db.session.add(journey)

        already_checked_in = Traveler.query.filter_by(
            journey_id=journey_id, user_id=user_id
        ).first()

        if already_checked_in is None:
            db.session.add(Traveler(
                journey_id=journey_id,
                user_id=user_id,
                user_name=user_name,
                user_photo=user_photo,
                social_intent=social_intent,
                coach=coach,
            ))
        elif coach:
            # Allow a returning check-in to fill in/update the self-reported coach.
            already_checked_in.coach = coach

        db.session.commit()

        return jsonify({
            "success": True,
            "journeyId": journey_id,
            "message": f"Successfully checked in to {train_number} on {departure_date}"
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.exception("Check-in error")
        return jsonify({"error": str(e)}), 500


@checkin_bp.route("/api/train-travelers/<journey_id>", methods=["GET"])
def get_train_travelers(journey_id):
    """
    Get list of travelers for a specific train journey.
    """
    try:
        journey = db.session.get(TrainJourney, journey_id)
        if journey is None:
            return jsonify({"travelers": []}), 200

        return jsonify({
            "travelers": [t.to_dict() for t in journey.travelers]
        }), 200

    except Exception as e:
        logger.exception("Error fetching travelers")
        return jsonify({"error": str(e)}), 500
