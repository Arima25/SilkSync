from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple

from services.train_service import (
    query_tickets,
    query_ticket_price,
    filter_valid_trains,
)


SEAT_CLASS = {
    "hard_seat": "budget",
    "second_class": "budget",
    "hard_sleeper": "budget",

    "first_class": "standard",
    "soft_sleeper": "standard",

    "business_class": "luxury"
}

# China timezone for "today" when user has no date
CHINA_TZ = timezone(timedelta(hours=8))


def _pick_lowest_price(prices: dict) -> Optional[float]:
    """Extract lowest numeric price from a dict of seat_type -> price (string or number)."""
    if not prices:
        return None
    values = []
    for v in prices.values():
        try:
            n = float(v) if not isinstance(v, (int, float)) else v
            if isinstance(n, (int, float)) and n > 0:
                values.append(n)
        except (TypeError, ValueError):
            continue
    return min(values) if values else None

def _pick_highest_price(prices: dict) -> Optional[float]:
    """Extract highest numeric price from a dict of seat_type -> price."""
    if not prices:
        return None

    values = []
    for v in prices.values():
        try:
            n = float(v) if not isinstance(v, (int, float)) else v
            if isinstance(n, (int, float)) and n > 0:
                values.append(n)
        except (TypeError, ValueError):
            continue

    return max(values) if values else None


async def get_average_ticket_price_for_route(
    from_station: str, to_station: str, mode: str = "budget", max_days: int = 14
) -> Tuple[Optional[float], Optional[str]]:
    """
    Find the first day with available tickets, collect all ticket prices for that day,
    and return the average. Uses current date (China time) then next days.
    Returns (average_price_cny, date_used) or (None, None) if no prices found.
    """
    pick_price = _pick_lowest_price if mode == "budget" else _pick_highest_price
    today = datetime.now(CHINA_TZ).date()
    for day_offset in range(max_days):
        train_date = (today + timedelta(days=day_offset)).strftime("%Y-%m-%d")
        tickets_data = await query_tickets(from_station, to_station, train_date)
        if not tickets_data.get("success") or not tickets_data.get("trains"):
            continue
        valid_trains = filter_valid_trains(tickets_data.get("trains", []))
        if not valid_trains:
            continue
        # Get prices for the day (one call without train_code returns all trains' prices)
        price_data = await query_ticket_price(from_station, to_station, train_date)
        prices_list = []
        if price_data.get("prices"):
            price = pick_price(price_data["prices"])
            if price is not None:
                prices_list.append(price)
        for row in price_data.get("data") or []:
            row_prices = row.get("prices") or {}
            price = pick_price(row_prices)
            if price is not None:
                prices_list.append(price)
        if prices_list:
            return (sum(prices_list) / len(prices_list), train_date)
    return (None, None)


# China's cities based off of economic tiers
CITY_TIERS = {
    # Tier 1 (most expensive)
    "Shanghai": 1,
    "Beijing": 1,
    "Shenzhen": 1,
    "Guangzhou": 1,

    # Tier 2
    "Hangzhou": 2,
    "Chengdu": 2,
    "Nanjing": 2,
    "C": 2,
    "Xi'an": 2,
    "Chongqing": 2,

    # Tier 3 (cheaper cities)
    "Kunming": 3,
    "Harbin": 3,
    "Guilin": 3,
    "Suzhou": 3
}

# Cost multipliers based off of city tiers
TIER_MULTIPLIER = {
    1: 1.4,  # Shanghai / Beijing
    2: 1.15, # Chengdu / Hangzhou
    3: 0.9   # cheaper cities
}


def get_city_multiplier(city: str) -> float:
    """
    Returns price multiplier based on Chinese city tier.
    Defaults to tier 3 if city not found.
    """

    tier = CITY_TIERS.get(city, 3)
    return TIER_MULTIPLIER[tier]


def _to_float(v) -> float | None:
    """Coerce to float (handles string "553.0" from MCP)."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v) if v > 0 else None
    try:
        n = float(v)
        return n if n > 0 else None
    except (TypeError, ValueError):
        return None


# Budget calculation engine
def calculate_trip_options(train_prices: dict, user_budget: float, destination: str, days: int = 3):
    """
    Generates budget vs luxury trip options using:
    - real train prices
    - location adjusted city pricing
    """

    multiplier = get_city_multiplier(destination)
    print("TRAIN PRICES RECEIVED:", train_prices)
    # Return real train prices for budget engine.
    budget_prices = []
    luxury_prices = []

    for seat, price in train_prices.items():
        try:
            p = float(price)
        except:
            continue

        category = SEAT_CLASS.get(seat)

        if category == "budget":
            budget_prices.append(p)

        if category == "luxury":
            luxury_prices.append(p)


    # Calculation of averages based off of budget vs luxury seats
    transport_budget = (
        sum(budget_prices) / len(budget_prices)
        if budget_prices else None
    )

    transport_luxury = (
        sum(luxury_prices) / len(luxury_prices)
        if luxury_prices else None
    )
    if transport_budget is None:
        print("⚠️ Budget seats missing — fallback")
        transport_budget = _pick_lowest_price(train_prices) or 450

    if transport_luxury is None:
        print("⚠️ Luxury seats missing — fallback")
        transport_luxury = _pick_highest_price(train_prices) or transport_budget * 1.6
    
    print("BUDGET SEATS FOUND:", budget_prices)
    print("LUXURY SEATS FOUND:", luxury_prices)
    print("BUDGET AVG:", transport_budget)
    print("LUXURY AVG:", transport_luxury)
    # Budget vs Luxury Hotel Costs
    budget_hotel = int(300 * multiplier * days)
    luxury_hotel = int(900 * multiplier * days)

    # Budget vs Luxury Food Costs
    budget_food = int(60 * multiplier * days)
    luxury_food = int(200 * multiplier * days)

    # Budget vs Luxury Local Transport costs
    metro_cost = int(20 * multiplier * days)
    taxi_cost = int(120 * multiplier * days)

    # Budget vs Luxury Total costs
    budget_total = transport_budget + budget_hotel + metro_cost + budget_food
    luxury_total = transport_luxury + luxury_hotel + taxi_cost + luxury_food

    # Provided recommendation based off of users budget
    if user_budget >= luxury_total:
        recommendation = "luxury"
    elif user_budget >= budget_total:
        recommendation = "budget"
    else:
        recommendation = "insufficient"
        # Determine which seat type was used
    budget_class = None
    luxury_class = None

    for seat, price in train_prices.items():
        try:
            p = float(price)
        except:
            continue

        seat_category = SEAT_CLASS.get(seat, "standard")

        if p == transport_budget:
            budget_class = seat.replace("_", " ").title()
            budget_category = seat_category

        if p == transport_luxury:
            luxury_class = seat.replace("_", " ").title()
            luxury_category = seat_category

    # fallback if API gave weird data
    if budget_class is None:
        budget_class = "Standard Seat"

    if luxury_class is None:
        luxury_class = "Premium Seat"

    return {
        "city": destination,
        "city_multiplier": multiplier,
        "recommendation": recommendation,

        "budget_trip": {
            "train_class": budget_class,
            "transport_cost": transport_budget,

            "hotel": "Budget Hotel",
            "hotel_cost": budget_hotel,

            "food": "Local restaurants",
            "food_cost": budget_food,

            "local_transport": "Metro",
            "local_transport_cost": metro_cost,

            "total_cost": budget_total
        },

        "luxury_trip": {
            "train_class": luxury_class,
            "transport_cost": transport_luxury,

            "hotel": "Luxury Hotel",
            "hotel_cost": luxury_hotel,

            "food": "High-end dining",
            "food_cost": luxury_food,

            "local_transport": "Taxi / DiDi",
            "local_transport_cost": taxi_cost,

            "total_cost": luxury_total
        }
    }