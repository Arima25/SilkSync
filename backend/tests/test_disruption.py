import pytest
import sys
import os
from unittest.mock import AsyncMock, patch
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
        TrainJourney.query.filter(TrainJourney.id.like("DISX%")).delete(synchronize_session=False)
        db.session.commit()


def _check_in(client, train_number="DISX1", departure_date="2026-03-15"):
    return client.post("/api/check-in", json={
        "userId": "dis-user-1",
        "userName": "Alice",
        "trainNumber": train_number,
        "departureDate": departure_date,
        "departureStation": "Beijing",
        "arrivalStation": "Shanghai",
        "socialIntent": "solo_traveler",
    })


def test_check_disruption_unknown_journey(client):
    result = client.post("/api/journeys/does-not-exist/check-disruption")
    assert result.status_code == 404


def test_check_disruption_marks_normal_when_train_still_scheduled(client):
    check_in_result = _check_in(client)
    journey_id = check_in_result.get_json()["journeyId"]

    mock_status = {"status": "normal", "alternatives": None}
    with patch("routes.disruption.check_journey_status", new=AsyncMock(return_value=mock_status)):
        result = client.post(f"/api/journeys/{journey_id}/check-disruption")

    assert result.status_code == 200
    data = result.get_json()
    assert data["status"] == "normal"
    assert data["alternatives"] is None


def test_check_disruption_marks_disrupted_and_returns_alternatives(client):
    check_in_result = _check_in(client, train_number="DISX2")
    journey_id = check_in_result.get_json()["journeyId"]

    mock_alternatives = {"type": "direct", "count": 1, "trains": [{"train_code": "G9"}]}
    mock_status = {"status": "disrupted", "alternatives": mock_alternatives}
    with patch("routes.disruption.check_journey_status", new=AsyncMock(return_value=mock_status)):
        result = client.post(f"/api/journeys/{journey_id}/check-disruption")

    assert result.status_code == 200
    data = result.get_json()
    assert data["status"] == "disrupted"
    assert data["alternatives"] == mock_alternatives
    assert data["justTransitioned"] is True

    with app.app_context():
        journey = db.session.get(TrainJourney, journey_id)
        assert journey.status == "disrupted"
        assert journey.alternatives_json is not None


def test_check_disruption_second_call_does_not_re_transition(client):
    check_in_result = _check_in(client, train_number="DISX3")
    journey_id = check_in_result.get_json()["journeyId"]

    mock_status = {"status": "disrupted", "alternatives": {"type": "direct", "trains": []}}
    with patch("routes.disruption.check_journey_status", new=AsyncMock(return_value=mock_status)):
        first = client.post(f"/api/journeys/{journey_id}/check-disruption")
        second = client.post(f"/api/journeys/{journey_id}/check-disruption")

    assert first.get_json()["justTransitioned"] is True
    assert second.get_json()["justTransitioned"] is False
