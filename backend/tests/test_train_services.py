import pytest
import json
from unittest.mock import AsyncMock, patch
from services.train_service import (
    parse_response,
    filter_valid_trains,
    format_train,
    format_transfer
)

# Test parse_response extracts data correctly from MCP
def test_parse_response_success():
    raw = {
        "result": {
            "content": [
                {"text": '{"success": true, "trains": []}'}
            ]
        }
    }
    result = parse_response(raw)
    
    assert result["success"] == True
    assert result["trains"] == []

# Test parse_response handles malformed input gracefully
def test_parse_response_malformed():
    result = parse_response({})
    assert result["success"] == False

# Test filter removes trains with no schedule
def test_filter_valid_trains_removes_unavailable():
    trains = [
        {"start_time": "06:30", "duration": "04:54"},  # valid
        {"start_time": "24:00", "duration": "99:59"},  # invalid or sold out
        {"start_time": "12:00", "duration": "02:30"},  # valid
    ]
    result = filter_valid_trains(trains)

    assert len(result) == 2
    assert all(t["start_time"] != "24:00" for t in result)

# Test filter with all valid trains
def test_filter_valid_trains_all_valid():
    trains = [
        {"start_time": "06:30", "duration": "04:54"},
        {"start_time": "10:00", "duration": "03:00"},
    ]
    result = filter_valid_trains(trains)
    assert len(result) == 2

# Test filter with all invalid trains
def test_filter_valid_trains_all_invalid():
    trains = [
        {"start_time": "24:00", "duration": "99:59"},
        {"start_time": "24:00", "duration": "99:59"},
    ]
    result = filter_valid_trains(trains)
    assert len(result) == 0

# Test format_train returns correct structure
def test_format_train_structure():
    train = {
        "train_no": "G1",
        "from_station": "北京南",
        "to_station": "上海虹桥",
        "start_time": "06:30",
        "arrive_time": "11:24",
        "duration": "04:54",
        "seats": {"business": "5", "first_class": "有"}
    }
    result = format_train(train)
    assert result["train_code"] == "G1"
    assert result["departure"] == "06:30"
    assert result["arrival"] == "11:24"
    assert result["duration"] == "04:54"

    assert result["from_station"]["zh"] == "北京南"
    assert result["from_station"]["en"] == "Beijing South"
    assert result["to_station"]["zh"] == "上海虹桥"
    assert isinstance(result["seats"], list)

#Test format_transfer returns correct structure
def test_format_transfer_structure():
    transfer = {
        "middle_station": "西安北",
        "wait_time": "32分钟",
        "total_duration": "8小时17分钟",
        "segments": [
            {
                "train_no": "G3418",
                "from_station": "成都东",
                "to_station": "西安北",
                "start_time": "06:34",
                "arrive_time": "09:52",
                "duration": "03:18",
                "seats": {}
            }
        ]
    }
    result = format_transfer(transfer)
    assert result["middle_station"]["zh"] == "西安北"
    assert result["middle_station"]["en"] == "Xi'an North"

    assert result["wait_time"] == "32分钟"
    assert len(result["legs"]) == 1

#Test get_route returns direct when trains are available
@pytest.mark.asyncio
async def test_get_route_returns_direct():
    mock_tickets = {
        "success": True,
        "trains": [
            {
                "train_no": "G1",
                "from_station": "北京南",
                "to_station": "上海虹桥",
                "start_time": "06:30",
                "arrive_time": "11:24",
                "duration": "04:54",
                "seats": {"business": "5"}
            }
        ]
    }

    with patch("services.train_service.query_tickets", new=AsyncMock(return_value=mock_tickets)):
        from services.train_service import get_route
        result = await get_route("北京", "上海", "2026-03-15")

        assert result["type"] == "direct"
        assert result["count"] == 1
        assert len(result["trains"]) == 1

# Test get_route falls back to transfer when no direct trains
@pytest.mark.asyncio
async def test_get_route_falls_back_to_transfer():
    mock_no_tickets = {"success": True, "trains": []}
    mock_transfer = {
        "success": True,
        "transfers": [
            {
                "middle_station": "西安北",
                "wait_time": "30分钟",
                "total_duration": "8小时",
                "segments": []
            }
        ]
    }

    with patch("services.train_service.query_tickets", new = AsyncMock(return_value = mock_no_tickets)), \
         patch("services.train_service.query_transfer", new = AsyncMock(return_value = mock_transfer)):
            from services.train_service import get_route
            result = await get_route("成都", "西宁", "2026-03-15")
            assert result["type"] == "transfer"
            assert result["count"] == 1