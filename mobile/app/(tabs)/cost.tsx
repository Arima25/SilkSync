import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Share,
  Alert,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useItinerary } from "@/src/context/ItineraryContext";
import { logger } from "@/lib/logger";

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;

export default function CostScreen() {
  const { itinerary } = useItinerary();

  const [backendBudget, setBackendBudget] = useState<any>(null);

  const destination = itinerary?.destination || "Shanghai";
  const days = itinerary?.days || 3;
  const style = (itinerary?.travelStyle || "budget").trim().toLowerCase();
  const tripBudget = itinerary?.budget || 450;

  const [transport, setTransport] = useState(0);
  const [food, setFood] = useState(0);
  const [lodging, setLodging] = useState(0);
  const [activities, setActivities] = useState(0);
  

  const handleBack = () => {
    router.replace("/(tabs)/plan");
  };

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        // Use price_for_route: no date in itinerary → backend uses current date (China),
        // tries next days until tickets found, averages prices for that day (like search.tsx flow)
        const response = await fetch(`${BACKEND_BASE_URL}/api/trains/price_for_route`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: itinerary?.origin || "Beijing",
            to: destination,
            budget: tripBudget,
            days: days,
          }),
        });

        const data = await response.json();
        logger.log("Budget Engine Response (price_for_route):", data);
        setBackendBudget(data);
      } catch (error) {
        logger.log("Budget API failed, using fallback estimates");
        setBackendBudget(null);
      }
    };

    fetchBudget();
  }, [destination, days, tripBudget, itinerary?.origin]);

  useEffect(() => {
    // Backend budget engine returned values
    const budgetTrip = backendBudget?.budget_analysis?.budget_trip;
    const luxuryTrip = backendBudget?.budget_analysis?.luxury_trip;
    logger.log("style:", style);
    logger.log("budget transport:", budgetTrip?.transport_cost);
    logger.log("luxury transport:", luxuryTrip?.transport_cost);
    const trip = style === "luxury" ? luxuryTrip : budgetTrip;
  
    if (trip) {
      const selectedTransport = Number(trip.transport_cost) || 0;
  
      setTransport(selectedTransport);
      setFood(Number(trip.food_cost) || 0);
      setLodging(Number(trip.hotel_cost) || 0);
      setActivities(
        Number(trip.local_transport_cost ?? trip.activity_cost) || 0
      );
      return;
    }
  
    // 3️⃣ Final fallback estimates
    const fallbackTransport =
      style === "luxury"
        ? Number(luxuryTrip?.transport_cost || 0)
        : Number(budgetTrip?.transport_cost || 0);
  
    const foodPerDay =
      style === "luxury" ? 120 : style === "mid" ? 60 : 35;
  
    const hotelPerNight =
      style === "luxury" ? 450 : style === "mid" ? 180 : 90;
  
    const activitiesPerDay =
      style === "luxury" ? 60 : style === "mid" ? 35 : 20;
  
    setTransport(fallbackTransport || tripBudget || 450);
    setFood(foodPerDay * days);
    setLodging(hotelPerNight * days);
    setActivities(activitiesPerDay * days);
  }, [backendBudget, itinerary, days, style, tripBudget]);

  // Total must equal sum of displayed categories so the numbers add up
  const total = transport + food + lodging + activities;
  
    const shareBudget = async () => {
      try {
        await Share.share({
          message: `My SilkSync trip to ${destination} for ${days} days costs about ¥${formatPrice(total)}`,
        });
      } catch (error) {
        Alert.alert("Error sharing trip");
      }
    };
  
  logger.log("Sending itinerary:", itinerary)

  const formatPrice = (n: number) =>
    Number(n).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const CNY_TO_USD = 0.14;

  const formatUsdFromCny = (n: number) =>
  Number(n * CNY_TO_USD).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const Card = ({ title, price, icon }: any) => (
    <View style={styles.card}>
      <Ionicons name={icon} size={22} color="#1E88E5" />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.priceBlock}>
        <Text style={styles.price}>¥{formatPrice(Number(price))}</Text>
        <Text style={styles.usdPrice}>${formatUsdFromCny(Number(price))}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={26} />
        </TouchableOpacity>

        <Text style={styles.title}>Trip Budget</Text>

        <TouchableOpacity onPress={shareBudget}>
          <Ionicons name="share-outline" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Card title="Transport" price={transport} icon="train-outline" />
        <Card title="Food" price={food} icon="restaurant-outline" />
        <Card title="Lodging" price={lodging} icon="bed-outline" />
        <Card title="Activities" price={activities} icon="ticket-outline" />

        <View style={styles.totalCard}>
          <Text style={styles.totalText}>Total Budget</Text>
          <View style={styles.totalPriceBlock}>
            <Text style={styles.totalPrice}>¥{formatPrice(total)}</Text>
            <Text style={styles.totalUsdPrice}>${formatUsdFromCny(total)}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  scroll: {
    padding: 20,
    gap: 14,
  },
  card: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  price: {
    fontSize: 18,
    fontWeight: "600",
  },
  totalCard: {
    marginTop: 25,
    padding: 24,
    backgroundColor: "#1E88E5",
    borderRadius: 16,
    alignItems: "center",
  },
  totalText: {
    color: "white",
    fontSize: 16,
  },
  totalPrice: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 4,
  },
  priceBlock: {
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  
  usdPrice: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  
  totalPriceBlock: {
    alignItems: "center",
  },
  
  totalUsdPrice: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginTop: 4,
  },
});