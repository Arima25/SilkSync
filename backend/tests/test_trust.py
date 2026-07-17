import pytest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app
from extensions import db
from models import TrainJourney


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client
    with app.app_context():
        TrainJourney.query.filter(TrainJourney.id.like("TRUSTY%")).delete(synchronize_session=False)
        db.session.commit()


def _check_in(client, **overrides):
    payload = {
        "userId": "trust-user-1",
        "userName": "Alice",
        "trainNumber": "TRUSTY1",
        "departureDate": "2026-03-15",
        "departureStation": "Beijing",
        "arrivalStation": "Shanghai",
        "socialIntent": "solo_traveler",
    }
    payload.update(overrides)
    return client.post("/api/check-in", json=payload)


def test_co_travelers_empty_for_unknown_user(client):
    result = client.get("/api/trust/co-travelers/nobody")
    assert result.status_code == 200
    assert result.get_json()["coTravelers"] == []


def test_co_travelers_finds_shared_journey(client):
    _check_in(client, userId="trust-user-1", userName="Alice", coach="05")
    _check_in(client, userId="trust-user-2", userName="Bob", coach="05")
    _check_in(client, userId="trust-user-3", userName="Carol", coach="09")

    result = client.get("/api/trust/co-travelers/trust-user-1")
    co_travelers = result.get_json()["coTravelers"]
    ids = {c["userId"] for c in co_travelers}

    assert ids == {"trust-user-2", "trust-user-3"}
    bob = next(c for c in co_travelers if c["userId"] == "trust-user-2")
    carol = next(c for c in co_travelers if c["userId"] == "trust-user-3")
    assert bob["sameCoach"] is True
    assert carol["sameCoach"] is False
    assert bob["trainNumber"] == "TRUSTY1"


def test_trust_score_counts_distinct_journeys(client):
    _check_in(client, userId="trust-user-4", trainNumber="TRUSTY1")
    _check_in(client, userId="trust-user-4", trainNumber="TRUSTY2", departureDate="2026-03-16")

    result = client.get("/api/trust/score/trust-user-4")
    assert result.get_json()["verifiedTripsCount"] == 2


def test_trust_score_zero_for_unknown_user(client):
    result = client.get("/api/trust/score/nobody")
    assert result.get_json()["verifiedTripsCount"] == 0
