import json
import logging

from flask import Blueprint, jsonify

from extensions import db
from models import TrainJourney
from services.disruption_service import check_journey_status

logger = logging.getLogger(__name__)

disruption_bp = Blueprint("disruption", __name__)


@disruption_bp.route("/api/journeys/<journey_id>/check-disruption", methods=["POST"])
async def check_disruption(journey_id):
    """
    Re-check a journey's schedule against 12306 and persist whether it's still normal
    or appears disrupted, along with alternative route options if so.
    """
    try:
        journey = db.session.get(TrainJourney, journey_id)
        if journey is None:
            return jsonify({"error": "Journey not found"}), 404

        previous_status = journey.status
        result = await check_journey_status(journey)

        journey.status = result["status"]
        journey.alternatives_json = (
            json.dumps(result["alternatives"]) if result["alternatives"] else None
        )
        db.session.commit()

        return jsonify({
            "journeyId": journey_id,
            "status": journey.status,
            "alternatives": result["alternatives"],
            # True only for the request that first observed the change -- lets clients
            # avoid every checked-in traveler posting a duplicate chat announcement.
            "justTransitioned": previous_status != journey.status,
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.exception("Check disruption error")
        return jsonify({"error": str(e)}), 500
