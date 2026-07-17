from datetime import datetime, timezone

from extensions import db


def _utcnow():
    return datetime.now(timezone.utc)


class TrainJourney(db.Model):
    __tablename__ = "train_journeys"

    id = db.Column(db.String, primary_key=True)  # e.g. "G1-2026-03-15"
    train_number = db.Column(db.String, nullable=False)
    departure_date = db.Column(db.String, nullable=False)
    departure_station = db.Column(db.String, nullable=False)
    arrival_station = db.Column(db.String, nullable=False)
    # "normal" | "disrupted" -- best-effort proxy from re-querying the day's schedule,
    # since 12306 (via this MCP) exposes timetables, not live delay telemetry.
    status = db.Column(db.String, default="normal", nullable=False)
    alternatives_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=_utcnow, nullable=False)

    travelers = db.relationship(
        "Traveler", backref="journey", cascade="all, delete-orphan", lazy="joined"
    )

    def to_dict(self):
        return {
            "trainNumber": self.train_number,
            "departureDate": self.departure_date,
            "departureStation": self.departure_station,
            "arrivalStation": self.arrival_station,
            "status": self.status,
            "travelers": [t.to_dict() for t in self.travelers],
            "createdAt": self.created_at.isoformat(),
        }


class Traveler(db.Model):
    __tablename__ = "travelers"
    __table_args__ = (
        db.UniqueConstraint("journey_id", "user_id", name="uq_journey_user"),
    )

    id = db.Column(db.Integer, primary_key=True)
    journey_id = db.Column(
        db.String, db.ForeignKey("train_journeys.id", ondelete="CASCADE"), nullable=False
    )
    user_id = db.Column(db.String, nullable=False)
    user_name = db.Column(db.String, nullable=False)
    user_photo = db.Column(db.String, nullable=True)
    social_intent = db.Column(db.String, nullable=True)
    coach = db.Column(db.String, nullable=True)  # self-reported carriage number, e.g. "05"
    checked_in_at = db.Column(db.DateTime, default=_utcnow, nullable=False)

    def to_dict(self):
        return {
            "userId": self.user_id,
            "userName": self.user_name,
            "userPhoto": self.user_photo,
            "socialIntent": self.social_intent,
            "coach": self.coach,
            "checkedInAt": self.checked_in_at.isoformat(),
        }


class BlockedUser(db.Model):
    __tablename__ = "blocked_users"
    __table_args__ = (
        db.UniqueConstraint("blocker_user_id", "blocked_user_id", name="uq_blocker_blocked"),
    )

    id = db.Column(db.Integer, primary_key=True)
    blocker_user_id = db.Column(db.String, nullable=False)
    blocked_user_id = db.Column(db.String, nullable=False)
    created_at = db.Column(db.DateTime, default=_utcnow, nullable=False)


class Report(db.Model):
    __tablename__ = "reports"

    id = db.Column(db.Integer, primary_key=True)
    reporter_user_id = db.Column(db.String, nullable=False)
    reported_user_id = db.Column(db.String, nullable=False)
    journey_id = db.Column(db.String, nullable=True)
    reason = db.Column(db.String, nullable=False)
    message = db.Column(db.String, nullable=True)
    # True when both reporter and reported were confirmed Travelers on journey_id --
    # a provable co-presence signal, not just a self-reported claim.
    verified = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=_utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "reporterUserId": self.reporter_user_id,
            "reportedUserId": self.reported_user_id,
            "journeyId": self.journey_id,
            "reason": self.reason,
            "message": self.message,
            "verified": self.verified,
            "createdAt": self.created_at.isoformat(),
        }
