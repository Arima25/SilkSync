import pytest
import sys
import os
from unittest.mock import AsyncMock, patch
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.disruption_service import check_journey_status


class FakeJourney:
    def __init__(self, train_number, departure_station, arrival_station, departure_date):
        self.train_number = train_number
        self.departure_station = departure_station
        self.arrival_station = arrival_station
        self.departure_date = departure_date


@pytest.mark.asyncio
async def test_status_normal_when_train_still_scheduled():
    journey = FakeJourney("G1", "北京", "上海", "2026-03-15")
    mock_tickets = {
        "success": True,
        "trains": [
            {"train_no": "G1", "start_time": "06:30", "duration": "04:54"},
        ],
    }

    with patch("services.disruption_service.query_tickets", new=AsyncMock(return_value=mock_tickets)):
        result = await check_journey_status(journey)

    assert result["status"] == "normal"
    assert result["alternatives"] is None


@pytest.mark.asyncio
async def test_status_disrupted_when_train_missing_from_schedule():
    journey = FakeJourney("G1", "北京", "上海", "2026-03-15")
    mock_tickets = {
        "success": True,
        "trains": [
            {"train_no": "G2", "start_time": "07:00", "duration": "05:00"},
        ],
    }
    mock_route = {"type": "direct", "count": 1, "trains": [{"train_code": "G2"}]}

    with patch("services.disruption_service.query_tickets", new=AsyncMock(return_value=mock_tickets)), \
         patch("services.disruption_service.get_route", new=AsyncMock(return_value=mock_route)):
        result = await check_journey_status(journey)

    assert result["status"] == "disrupted"
    assert result["alternatives"] == mock_route


@pytest.mark.asyncio
async def test_status_disrupted_when_train_becomes_invalid():
    journey = FakeJourney("G1", "北京", "上海", "2026-03-15")
    mock_tickets = {
        "success": True,
        "trains": [
            {"train_no": "G1", "start_time": "24:00", "duration": "99:59"},  # sold out/unavailable
        ],
    }
    mock_route = {"type": "transfer", "count": 0, "options": []}

    with patch("services.disruption_service.query_tickets", new=AsyncMock(return_value=mock_tickets)), \
         patch("services.disruption_service.get_route", new=AsyncMock(return_value=mock_route)):
        result = await check_journey_status(journey)

    assert result["status"] == "disrupted"
    assert result["alternatives"] == mock_route


@pytest.mark.asyncio
async def test_status_disrupted_when_query_fails():
    journey = FakeJourney("G1", "北京", "上海", "2026-03-15")
    mock_tickets = {"success": False}
    mock_route = {"type": "direct", "count": 0, "trains": []}

    with patch("services.disruption_service.query_tickets", new=AsyncMock(return_value=mock_tickets)), \
         patch("services.disruption_service.get_route", new=AsyncMock(return_value=mock_route)):
        result = await check_journey_status(journey)

    assert result["status"] == "disrupted"
