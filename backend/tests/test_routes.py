import pytest
import json
from unittest.mock import patch, AsyncMock
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

# Test station search returns 400 when query is missing
def test_station_search_missing_query(client):
    result = client.get("/api/trains/stations/search")
    
    assert result.status_code == 400
    assert "error" in result.get_json()

# Test station search calls service correctly
def test_station_search_success(client):
    mock_result = {"success": True, "stations": [{"name": "北京", "code": "BJP"}]}
    with patch("main.search_stations", new = AsyncMock(return_value = mock_result)):
        result = client.get("/api/trains/stations/search?q=beijing")
        assert result.status_code == 200

        data = result.get_json()
        assert data["success"] == True

# Test route endpoint returns 400 when parameters are missing
def test_route_missing_params(client):
    result = client.get("/api/trains/route?from_station=北京")
    assert result.status_code == 400

# Test route endpoint returns data correctly
def test_route_success(client):
    mock_result = {
        "type": "direct",
        "from": {"zh": "北京", "en": "Beijing"},
        "to": {"zh": "上海", "en": "Shanghai"},
        "date": "2026-03-15",
        "count": 1,
        "trains": []
    }

    with patch("main.get_route", new = AsyncMock(return_value = mock_result)):
        result = client.get("/api/trains/route?from_station=北京&to_station=上海&train_date=2026-03-15")
        assert result.status_code == 200

        data = result.get_json()
        assert data["type"] == "direct"

# Test current time endpoint
def test_current_time(client):
    mock_result = {"current_date": "2026-03-15", "current_time": "10:00"}
    with patch("main.get_current_time", new = AsyncMock(return_value = mock_result)):
        result = client.get("/api/trains/current-time")
        assert result.status_code == 200

# Test nearest stations returns 400 when city missing
def test_nearest_stations_missing_city(client):
    result = client.get("/api/trains/nearest-stations")
    assert result.status_code == 400

# Test transfer endpoint missing params
def test_transfer_missing_params(client):
    result = client.get("/api/trains/transfer?from_station=北京")
    assert result.status_code == 400