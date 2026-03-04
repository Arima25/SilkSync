import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Share,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useItinerary } from '@/src/context/ItineraryContext';
import Constants from "expo-constants";

const host = Constants.expoConfig?.hostUri?.split(":")[0];
const API_URL = `http://${host}:5001`;

type CurrencyView = 'USD' | 'CNY' | 'side-by-side';

export default function CostScreen() {
  const { itinerary } = useItinerary();

  const [currencyView, setCurrencyView] = useState<CurrencyView>('side-by-side');
  const [backendBudget, setBackendBudget] = useState<any>(null);

  const handleBack = () => {
    router.back();
  };

  const handleShare = async () => {
    try {
      const shareMessage = `🌏 My Trip Budget - ${itinerary.origin} to ${itinerary.destination}

💰 Total Budget: $${itinerary.totalBudgetUSD.toLocaleString()} USD

Shared via SilkSync ✨`;

      await Share.share({
        message: shareMessage,
        title: 'My SilkSync Trip Budget',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share itinerary');
    }
  };

  /*
  ---------------------------------------------------------
  FETCH BUDGET ENGINE
  ---------------------------------------------------------
  */

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        const response = await fetch(`${API_URL}/search_route`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: itinerary.origin,
            to: itinerary.destination,
            date: "2026-03-15",
            budget: itinerary.totalBudgetUSD
          })
        });

        const data = await response.json();

        console.log("Budget API response:", data);

        setBackendBudget(data.budget_analysis);

      } catch (err) {
        console.log("Budget API error:", err);
      }
    };

    fetchBudget();
  }, []);

  const formatAmount = (usd: number, cny: number) => {
    switch (currencyView) {
      case 'USD':
        return `$${usd.toFixed(2)}`;
      case 'CNY':
        return `¥${cny.toFixed(2)}`;
      case 'side-by-side':
      default:
        return {
          usd: `$${usd.toFixed(2)}`,
          cny: `¥${cny.toFixed(2)}`
        };
    }
  };

  const totalSpent = itinerary.categories.reduce((sum, cat) => sum + cat.amountUSD, 0);

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Cost Breakdown</Text>

        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Budget Engine Recommendation */}
        {backendBudget && (
          <View style={styles.recommendCard}>

            <Text style={styles.recommendTitle}>
              Smart Budget Recommendation
            </Text>

            <Text style={styles.recommendText}>
              Recommended: {backendBudget.recommendation}
            </Text>

            <View style={styles.optionRow}>

              <View style={styles.optionCard}>
                <Text style={styles.optionTitle}>Budget Trip</Text>

                <Text>Train: {backendBudget.budget_trip.train_class}</Text>
                <Text>Hotel: {backendBudget.budget_trip.hotel}</Text>

                <Text style={styles.optionPrice}>
                  ${backendBudget.budget_trip.total_cost}
                </Text>
              </View>

              <View style={styles.optionCard}>
                <Text style={styles.optionTitle}>Luxury Trip</Text>

                <Text>Train: {backendBudget.luxury_trip.train_class}</Text>
                <Text>Hotel: {backendBudget.luxury_trip.hotel}</Text>

                <Text style={styles.optionPrice}>
                  ${backendBudget.luxury_trip.total_cost}
                </Text>
              </View>

            </View>

          </View>
        )}

        {/* Original UI continues */}
        <View style={styles.budgetCard}>

          <Text style={styles.budgetTitle}>
            Total Trip Budget
          </Text>

          <Text style={styles.budgetAmount}>
            ${itinerary.totalBudgetUSD.toLocaleString()}
          </Text>

        </View>

        {/* Category Details */}

        {itinerary.categories.map((category) => (

          <View key={category.id} style={styles.categoryItem}>

            <View style={styles.categoryLeft}>

              <Ionicons
                name={category.icon as any}
                size={20}
                color={category.color}
              />

              <Text style={styles.categoryName}>
                {category.name}
              </Text>

            </View>

            <View>

              {currencyView === 'side-by-side' ? (
                <>
                  <Text>${category.amountUSD.toFixed(2)}</Text>
                  <Text>¥{category.amountCNY.toFixed(2)}</Text>
                </>
              ) : (
                <Text>
                  {formatAmount(category.amountUSD, category.amountCNY) as string}
                </Text>
              )}

            </View>

          </View>

        ))}

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff'
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '600'
  },

  budgetCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12
  },

  budgetTitle: {
    fontSize: 16,
    fontWeight: '600'
  },

  budgetAmount: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8
  },

  recommendCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12
  },

  recommendTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6
  },

  recommendText: {
    fontSize: 14,
    marginBottom: 12
  },

  optionRow: {
    flexDirection: 'row',
    gap: 10
  },

  optionCard: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10
  },

  optionTitle: {
    fontWeight: '600',
    marginBottom: 6
  },

  optionPrice: {
    marginTop: 6,
    fontWeight: '700'
  },

  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    borderRadius: 10
  },

  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },

  categoryName: {
    fontWeight: '500'
  }

});