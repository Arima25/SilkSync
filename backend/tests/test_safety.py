import pytest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app
from extensions import db
from models import BlockedUser, Report, TrainJourney


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client
    with app.app_context():
        BlockedUser.query.filter(BlockedUser.blocker_user_id.like("TESTU%")).delete(synchronize_session=False)
        Report.query.filter(Report.reporter_user_id.like("TESTU%")).delete(synchronize_session=False)
        TrainJourney.query.filter(TrainJourney.id.like("TRUSTX%")).delete(synchronize_session=False)
        db.session.commit()


def test_block_missing_fields(client):
    result = client.post("/api/block", json={"userId": "TESTU1"})
    assert result.status_code == 400


def test_block_self_rejected(client):
    result = client.post("/api/block", json={"userId": "TESTU1", "blockedUserId": "TESTU1"})
    assert result.status_code == 400


def test_block_and_list(client):
    result = client.post("/api/block", json={"userId": "TESTU1", "blockedUserId": "TESTU2"})
    assert result.status_code == 200
    assert result.get_json()["success"] is True

    blocked = client.get("/api/blocked/TESTU1")
    assert blocked.status_code == 200
    assert blocked.get_json()["blockedUserIds"] == ["TESTU2"]


def test_block_is_idempotent(client):
    client.post("/api/block", json={"userId": "TESTU1", "blockedUserId": "TESTU2"})
    client.post("/api/block", json={"userId": "TESTU1", "blockedUserId": "TESTU2"})

    blocked = client.get("/api/blocked/TESTU1")
    assert blocked.get_json()["blockedUserIds"] == ["TESTU2"]


def test_unblock_removes_entry(client):
    client.post("/api/block", json={"userId": "TESTU1", "blockedUserId": "TESTU2"})
    result = client.delete("/api/block/TESTU1/TESTU2")
    assert result.status_code == 200

    blocked = client.get("/api/blocked/TESTU1")
    assert blocked.get_json()["blockedUserIds"] == []


def test_report_missing_fields(client):
    result = client.post("/api/report", json={"reporterUserId": "TESTU1"})
    assert result.status_code == 400


def test_report_invalid_reason(client):
    result = client.post("/api/report", json={
        "reporterUserId": "TESTU1",
        "reportedUserId": "TESTU2",
        "reason": "not_a_real_reason",
    })
    assert result.status_code == 400


def test_report_success(client):
    result = client.post("/api/report", json={
        "reporterUserId": "TESTU1",
        "reportedUserId": "TESTU2",
        "journeyId": "G1-2026-03-15",
        "reason": "harassment",
        "message": "Sent inappropriate messages in chat.",
    })
    assert result.status_code == 200
    data = result.get_json()
    assert data["success"] is True
    assert "reportId" in data


def test_report_unverified_when_no_shared_journey(client):
    result = client.post("/api/report", json={
        "reporterUserId": "TESTU1",
        "reportedUserId": "TESTU2",
        "journeyId": "TRUSTX1-2026-03-15",
        "reason": "spam",
    })
    report_id = result.get_json()["reportId"]

    with app.app_context():
        report = db.session.get(Report, report_id)
        assert report.verified is False


def test_report_verified_when_both_checked_into_journey(client):
    client.post("/api/check-in", json={
        "userId": "TESTU1",
        "userName": "Alice",
        "trainNumber": "TRUSTX2",
        "departureDate": "2026-03-15",
        "departureStation": "Beijing",
        "arrivalStation": "Shanghai",
        "socialIntent": "solo_traveler",
    })
    client.post("/api/check-in", json={
        "userId": "TESTU2",
        "userName": "Bob",
        "trainNumber": "TRUSTX2",
        "departureDate": "2026-03-15",
        "departureStation": "Beijing",
        "arrivalStation": "Shanghai",
        "socialIntent": "solo_traveler",
    })

    result = client.post("/api/report", json={
        "reporterUserId": "TESTU1",
        "reportedUserId": "TESTU2",
        "journeyId": "TRUSTX2-2026-03-15",
        "reason": "safety",
    })
    report_id = result.get_json()["reportId"]

    with app.app_context():
        report = db.session.get(Report, report_id)
        assert report.verified is True
