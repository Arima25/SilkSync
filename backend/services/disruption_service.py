from services.train_service import query_tickets, filter_valid_trains, get_route


async def check_journey_status(journey) -> dict:
    """
    Re-query the day's schedule for a checked-in journey and see whether its train
    number still appears with a valid schedule. This is a proxy for "disrupted" --
    12306 (via this MCP) exposes scheduled timetables, not live delay telemetry, so
    a train silently dropping out of/becoming invalid in the day's results is the
    best available signal for cancellation or unavailability.

    Returns {"status": "normal" | "disrupted", "alternatives": route_data | None}.
    """
    tickets_data = await query_tickets(
        journey.departure_station, journey.arrival_station, journey.departure_date
    )

    valid_trains = (
        filter_valid_trains(tickets_data.get("trains", []))
        if tickets_data.get("success")
        else []
    )
    train_numbers = {t.get("train_no") for t in valid_trains}

    if journey.train_number in train_numbers:
        return {"status": "normal", "alternatives": None}

    alternatives = await get_route(
        journey.departure_station, journey.arrival_station, journey.departure_date
    )
    return {"status": "disrupted", "alternatives": alternatives}
