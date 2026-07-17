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
        TrainJourney.query.filter(TrainJourney.id.like("TESTX%")).delete(synchronize_session=False)
        db.session.commit()


def _payload(**overrides):
    payload = {
        "userId": "user-1",
        "userName": "Alice",
        "userPhoto": None,
        "trainNumber": "TESTX1",
        "departureDate": "2026-03-15",
        "departureStation": "Beijing",
        "arrivalStation": "Shanghai",
        "socialIntent": "solo_traveler",
    }
    payload.update(overrides)
    return payload


def test_check_in_missing_fields(client):
    result = client.post("/api/check-in", json={"userId": "user-1"})
    assert result.status_code == 400
    assert "error" in result.get_json()


def test_check_in_creates_journey_and_traveler(client):
    result = client.post("/api/check-in", json=_payload())
    assert result.status_code == 200
    data = result.get_json()
    assert data["success"] is True
    assert data["journeyId"] == "TESTX1-2026-03-15"

    travelers = client.get(f"/api/train-travelers/{data['journeyId']}")
    assert travelers.status_code == 200
    names = [t["userName"] for t in travelers.get_json()["travelers"]]
    assert names == ["Alice"]


def test_check_in_same_user_twice_does_not_duplicate(client):
    client.post("/api/check-in", json=_payload())
    result = client.post("/api/check-in", json=_payload())
    assert result.status_code == 200

    journey_id = result.get_json()["journeyId"]
    travelers = client.get(f"/api/train-travelers/{journey_id}")
    assert len(travelers.get_json()["travelers"]) == 1


def test_check_in_second_user_joins_same_journey(client):
    client.post("/api/check-in", json=_payload())
    client.post("/api/check-in", json=_payload(userId="user-2", userName="Bob"))

    travelers = client.get("/api/train-travelers/TESTX1-2026-03-15")
    names = sorted(t["userName"] for t in travelers.get_json()["travelers"])
    assert names == ["Alice", "Bob"]


def test_get_travelers_unknown_journey_returns_empty(client):
    result = client.get("/api/train-travelers/does-not-exist")
    assert result.status_code == 200
    assert result.get_json()["travelers"] == []


def test_check_in_coach_round_trips(client):
    result = client.post("/api/check-in", json=_payload(coach="05"))
    journey_id = result.get_json()["journeyId"]

    travelers = client.get(f"/api/train-travelers/{journey_id}")
    assert travelers.get_json()["travelers"][0]["coach"] == "05"


def test_check_in_again_updates_coach(client):
    client.post("/api/check-in", json=_payload())
    result = client.post("/api/check-in", json=_payload(coach="12"))
    journey_id = result.get_json()["journeyId"]

    travelers = client.get(f"/api/train-travelers/{journey_id}")
    assert travelers.get_json()["travelers"][0]["coach"] == "12"
