// Home Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiService, currencyService, authService } from '@/services';
import { RootStackParamList, City, Itinerary } from '@/types';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [cities, setCities] = useState<City[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState<string>('Traveler');

  useEffect(() => {
    loadData();
    const user = authService.getCurrentUser();
    if (user?.displayName) {
      setUserName(user.displayName);
    }
  }, []);

  const loadData = async () => {
    try {
      await currencyService.fetchRates();
      const citiesData = await apiService.getCities();
      setCities(citiesData);
      
      const itinerariesData = await apiService.getItineraries();
      setItineraries(itinerariesData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const popularRoutes = [
    { from: 'Beijing', to: 'Shanghai', emoji: '🚄' },
    { from: 'Shanghai', to: 'Hangzhou', emoji: '🚄' },
    { from: 'Guangzhou', to: 'Hong Kong', emoji: '✈️' },
    { from: 'Chengdu', to: "Xi'an", emoji: '🚄' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome, {userName}! 👋</Text>
        <Text style={styles.subtitle}>Where will the Silk Road take you?</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Search</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.navigate('Search')}
        >
          <Text style={styles.searchButtonText}>🔍 Find Routes & Travel Companions</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Routes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {popularRoutes.map((route, index) => (
            <TouchableOpacity
              key={index}
              style={styles.routeCard}
              onPress={() => navigation.navigate('Search')}
            >
              <Text style={styles.routeEmoji}>{route.emoji}</Text>
              <Text style={styles.routeText}>
                {route.from} → {route.to}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Exchange Rate</Text>
        <View style={styles.exchangeCard}>
          <Text style={styles.exchangeRate}>
            1 USD = {currencyService.formatCurrency(
              currencyService.usdToCny(1),
              'CNY'
            ).replace('¥', '')} CNY
          </Text>
          <Text style={styles.exchangeSubtext}>Updated just now</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Trips</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {itineraries.length > 0 ? (
          itineraries.slice(0, 3).map((itinerary) => (
            <View key={itinerary.id} style={styles.tripCard}>
              <Text style={styles.tripStatus}>
                {itinerary.status === 'confirmed' ? '✅' : '📋'} {itinerary.status.toUpperCase()}
              </Text>
              <Text style={styles.tripDate}>
                {new Date(itinerary.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyTrips}>
            <Text style={styles.emptyText}>No trips planned yet</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Search')}>
              <Text style={styles.planTripLink}>Plan your first trip →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Map', {})}
          >
            <Text style={styles.actionIcon}>🗺️</Text>
            <Text style={styles.actionText}>Explore Map</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Matches', { travelerId: 0 })}
          >
            <Text style={styles.actionIcon}>👥</Text>
            <Text style={styles.actionText}>Find Companions</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>🚄</Text>
            <Text style={styles.actionText}>HSR Schedules</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>✈️</Text>
            <Text style={styles.actionText}>Flights</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  seeAll: {
    color: '#c9a227',
    fontSize: 14,
  },
  searchButton: {
    backgroundColor: '#2a2a4a',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#c9a227',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  routeCard: {
    backgroundColor: '#2a2a4a',
    borderRadius: 12,
    padding: 15,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 140,
  },
  routeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  routeText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  exchangeCard: {
    backgroundColor: '#2a2a4a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  exchangeRate: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#c9a227',
  },
  exchangeSubtext: {
    color: '#888',
    marginTop: 5,
  },
  tripCard: {
    backgroundColor: '#2a2a4a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripStatus: {
    color: '#fff',
    fontSize: 14,
  },
  tripDate: {
    color: '#888',
    fontSize: 12,
  },
  emptyTrips: {
    backgroundColor: '#2a2a4a',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    marginBottom: 10,
  },
  planTripLink: {
    color: '#c9a227',
    fontSize: 14,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: '#2a2a4a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
  },
});

export default HomeScreen;
