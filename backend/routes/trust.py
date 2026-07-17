import logging

from flask import Blueprint, jsonify

from models import Traveler

logger = logging.getLogger(__name__)

trust_bp = Blueprint("trust", __name__)


@trust_bp.route("/api/trust/co-travelers/<user_id>", methods=["GET"])
def get_co_travelers(user_id):
    """
    Every other user who has ever shared a journey_id (same train + date) with
    user_id -- a provable "we were on the same train" signal, not a self-reported
    "planning to meet" claim.
    """
    try:
        my_journeys = Traveler.query.filter_by(user_id=user_id).all()
        my_journey_ids = {t.journey_id for t in my_journeys}
        my_coach_by_journey = {t.journey_id: t.coach for t in my_journeys}

        if not my_journey_ids:
            return jsonify({"coTravelers": []}), 200

        co_travelers = (
            Traveler.query.filter(Traveler.journey_id.in_(my_journey_ids))
            .filter(Traveler.user_id != user_id)
            .all()
        )

        results = []
        for t in co_travelers:
            my_coach = my_coach_by_journey.get(t.journey_id)
            results.append({
                "userId": t.user_id,
                "userName": t.user_name,
                "journeyId": t.journey_id,
                "trainNumber": t.journey.train_number,
                "departureDate": t.journey.departure_date,
                "sameCoach": bool(my_coach and t.coach and my_coach == t.coach),
            })

        return jsonify({"coTravelers": results}), 200

    except Exception as e:
        logger.exception("Get co-travelers error")
        return jsonify({"error": str(e)}), 500


@trust_bp.route("/api/trust/score/<user_id>", methods=["GET"])
def get_trust_score(user_id):
    """Number of distinct journeys user_id has checked into -- a simple 'Verified Traveler' score."""
    try:
        journey_ids = {
            t.journey_id for t in Traveler.query.filter_by(user_id=user_id).all()
        }
        return jsonify({"verifiedTripsCount": len(journey_ids)}), 200

    except Exception as e:
        logger.exception("Get trust score error")
        return jsonify({"error": str(e)}), 500
