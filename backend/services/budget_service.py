# services/budget_service.py

def calculate_trip_options(train_prices: dict, user_budget: float):
    """
    Generates budget vs luxury trip options using REAL train prices.
    """

    # Use real prices if available
    transport_budget = train_prices.get("second_class", 550)
    transport_luxury = train_prices.get("first_class", 950)

    # hotel estimates per night (CNY)
    budget_hotel = 300
    luxury_hotel = 900

    # local transport estimates
    metro_cost = 20
    taxi_cost = 120

    # calculate totals
    budget_total = transport_budget + budget_hotel + metro_cost
    luxury_total = transport_luxury + luxury_hotel + taxi_cost

    # recommendation logic
    if user_budget >= luxury_total:
        recommendation = "luxury"
    elif user_budget >= budget_total:
        recommendation = "budget"
    else:
        recommendation = "insufficient"

    return {
        "recommendation": recommendation,

        "budget_trip": {
            "train_class": "Second Class HSR",
            "transport_cost": transport_budget,
            "hotel": "Budget Hotel",
            "hotel_cost": budget_hotel,
            "local_transport": "Metro",
            "local_transport_cost": metro_cost,
            "total_cost": budget_total
        },

        "luxury_trip": {
            "train_class": "First Class HSR",
            "transport_cost": transport_luxury,
            "hotel": "Luxury Hotel",
            "hotel_cost": luxury_hotel,
            "local_transport": "Taxi / DiDi",
            "local_transport_cost": taxi_cost,
            "total_cost": luxury_total
        }
    }