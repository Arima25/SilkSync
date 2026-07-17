import logging

from flask import Blueprint, request, jsonify

from extensions import db
from models import BlockedUser, Report, Traveler

logger = logging.getLogger(__name__)

safety_bp = Blueprint("safety", __name__)

REPORT_REASONS = {"harassment", "inappropriate", "spam", "safety", "other"}


@safety_bp.route("/api/block", methods=["POST"])
def block_user():
    """Block another user so their messages/traveler entries are hidden client-side."""
    try:
        data = request.get_json()
        blocker_user_id = data.get("userId")
        blocked_user_id = data.get("blockedUserId")

        if not blocker_user_id or not blocked_user_id:
            return jsonify({"error": "Missing required fields"}), 400
        if blocker_user_id == blocked_user_id:
            return jsonify({"error": "Cannot block yourself"}), 400

        existing = BlockedUser.query.filter_by(
            blocker_user_id=blocker_user_id, blocked_user_id=blocked_user_id
        ).first()

        if existing is None:
            db.session.add(BlockedUser(
                blocker_user_id=blocker_user_id,
                blocked_user_id=blocked_user_id,
            ))
            db.session.commit()

        return jsonify({"success": True}), 200

    except Exception as e:
        db.session.rollback()
        logger.exception("Block user error")
        return jsonify({"error": str(e)}), 500


@safety_bp.route("/api/block/<blocker_user_id>/<blocked_user_id>", methods=["DELETE"])
def unblock_user(blocker_user_id, blocked_user_id):
    """Remove a block."""
    try:
        BlockedUser.query.filter_by(
            blocker_user_id=blocker_user_id, blocked_user_id=blocked_user_id
        ).delete()
        db.session.commit()
        return jsonify({"success": True}), 200

    except Exception as e:
        db.session.rollback()
        logger.exception("Unblock user error")
        return jsonify({"error": str(e)}), 500


@safety_bp.route("/api/blocked/<user_id>", methods=["GET"])
def get_blocked_users(user_id):
    """List the user ids that `user_id` has blocked."""
    try:
        blocks = BlockedUser.query.filter_by(blocker_user_id=user_id).all()
        return jsonify({"blockedUserIds": [b.blocked_user_id for b in blocks]}), 200

    except Exception as e:
        logger.exception("Get blocked users error")
        return jsonify({"error": str(e)}), 500


@safety_bp.route("/api/report", methods=["POST"])
def report_user():
    """File a report against another user, optionally scoped to a journey."""
    try:
        data = request.get_json()
        reporter_user_id = data.get("reporterUserId")
        reported_user_id = data.get("reportedUserId")
        journey_id = data.get("journeyId")
        reason = data.get("reason")
        message = data.get("message")

        if not reporter_user_id or not reported_user_id or not reason:
            return jsonify({"error": "Missing required fields"}), 400
        if reason not in REPORT_REASONS:
            return jsonify({"error": f"reason must be one of {sorted(REPORT_REASONS)}"}), 400

        verified = False
        if journey_id:
            reporter_present = Traveler.query.filter_by(
                journey_id=journey_id, user_id=reporter_user_id
            ).first()
            reported_present = Traveler.query.filter_by(
                journey_id=journey_id, user_id=reported_user_id
            ).first()
            verified = bool(reporter_present and reported_present)

        report = Report(
            reporter_user_id=reporter_user_id,
            reported_user_id=reported_user_id,
            journey_id=journey_id,
            reason=reason,
            message=message,
            verified=verified,
        )
        db.session.add(report)
        db.session.commit()

        return jsonify({"success": True, "reportId": report.id}), 200

    except Exception as e:
        db.session.rollback()
        logger.exception("Report user error")
        return jsonify({"error": str(e)}), 500
