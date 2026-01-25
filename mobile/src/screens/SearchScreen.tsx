// Search Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiService, currencyService } from '@/services';
import { RootStackParamList, City, SearchFormData, HSRRoute, FlightRoute } from '@/types';

type SearchScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Search'>;
};

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hsrRoutes, setHsrRoutes] = useState<HSRRoute[]>([]);
  const [flights, setFlights] = useState<FlightRoute[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  const [formData, setFormData] = useState<SearchFormData>({
    origin: '',
    destination: '',
    travelDate: new Date(),
    budget: 1000,
    budgetCurrency: 'CNY',
  });

  useEffect(() => {
    loadCities();
  }, []);

  const loadCities = async () => {
    try {
      const citiesData = await apiService.getCities();
      setCities(citiesData);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  const handleSearch = async () => {
    if (!formData.origin || !formData.destination) {
      Alert.alert('Error', 'Please select origin and destination');
      return;
    }

    setIsLoading(true);
    try {
      const routes = await apiService.searchRoutes(formData);
      setHsrRoutes(routes.hsr);
      setFlights(routes.flights);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching routes:', error);
      Alert.alert('Error', 'Failed to search routes');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const toggleCurrency = () => {
    const newCurrency = formData.budgetCurrency === 'CNY' ? 'USD' : 'CNY';
    const convertedBudget =
      newCurrency === 'USD'
        ? currencyService.cnyToUsd(formData.budget)
        : currencyService.usdToCny(formData.budget);
    
    setFormData({
      ...formData,
      budgetCurrency: newCurrency,
      budget: Math.round(convertedBudget),
    });
  };

  const renderRouteCard = (route: HSRRoute | FlightRoute, type: 'hsr' | 'flight') => {
    const routeNumber = type === 'hsr' 
      ? (route as HSRRoute).trainNumber 
      : (route as FlightRoute).flightNumber;
    
    return (
      <TouchableOpacity
        key={route.id}
        style={styles.routeCard}
        onPress={() => navigation.navigate('RouteDetails', { routeId: route.id, routeType: type })}
      >
        <View style={styles.routeHeader}>
          <Text style={styles.routeNumber}>
            {type === 'hsr' ? '🚄' : '✈️'} {routeNumber}
          </Text>
          <Text style={styles.routePrice}>
            ¥{route.price}
            {route.priceUSD && (
              <Text style={styles.priceUsd}> (${route.priceUSD})</Text>
            )}
          </Text>
        </View>
        <View style={styles.routeDetails}>
          <Text style={styles.routeTime}>⏰ {route.departureTime}</Text>
          <Text style={styles.routeDuration}>⏱️ {formatDuration(route.duration)}</Text>
        </View>
        {(route as FlightRoute).airline && (
          <Text style={styles.airline}>{(route as FlightRoute).airline}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search Routes</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>From</Text>
        <TextInput
          style={styles.input}
          placeholder="Select origin city"
          placeholderTextColor="#888"
          value={formData.origin}
          onChangeText={(text) => setFormData({ ...formData, origin: text })}
        />

        <TouchableOpacity style={styles.swapButton}>
          <Text style={styles.swapIcon}>⇅</Text>
        </TouchableOpacity>

        <Text style={styles.label}>To</Text>
        <TextInput
          style={styles.input}
          placeholder="Select destination city"
          placeholderTextColor="#888"
          value={formData.destination}
          onChangeText={(text) => setFormData({ ...formData, destination: text })}
        />

        <Text style={styles.label}>Travel Date</Text>
        <TouchableOpacity style={styles.input}>
          <Text style={styles.inputText}>
            📅 {formData.travelDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        <View style={styles.budgetRow}>
          <View style={styles.budgetInput}>
            <Text style={styles.label}>Budget</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter budget"
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={formData.budget.toString()}
              onChangeText={(text) =>
                setFormData({ ...formData, budget: parseInt(text) || 0 })
              }
            />
          </View>
          <TouchableOpacity style={styles.currencyToggle} onPress={toggleCurrency}>
            <Text style={styles.currencyText}>{formData.budgetCurrency}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#1a1a2e" />
          ) : (
            <Text style={styles.searchButtonText}>Search Routes</Text>
          )}
        </TouchableOpacity>
      </View>

      {showResults && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>🚄 High-Speed Rail</Text>
          {hsrRoutes.length > 0 ? (
            hsrRoutes.map((route) => renderRouteCard(route, 'hsr'))
          ) : (
            <Text style={styles.noResults}>No HSR routes found</Text>
          )}

          <Text style={styles.resultsTitle}>✈️ Flights</Text>
          {flights.length > 0 ? (
            flights.map((route) => renderRouteCard(route, 'flight'))
          ) : (
            <Text style={styles.noResults}>No flights found</Text>
          )}
        </View>
      )}
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  form: {
    padding: 20,
  },
  label: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#2a2a4a',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 16,
  },
  inputText: {
    color: '#fff',
    fontSize: 16,
  },
  swapButton: {
    alignSelf: 'center',
    padding: 10,
    marginVertical: 5,
  },
  swapIcon: {
    fontSize: 24,
    color: '#c9a227',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  budgetInput: {
    flex: 1,
    marginRight: 10,
  },
  currencyToggle: {
    backgroundColor: '#c9a227',
    borderRadius: 10,
    padding: 15,
    marginBottom: 0,
  },
  currencyText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#c9a227',
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
    marginTop: 25,
  },
  searchButtonText: {
    color: '#1a1a2e',
    fontSize: 18,
    fontWeight: 'bold',
  },
  results: {
    padding: 20,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 20,
    marginBottom: 15,
  },
  routeCard: {
    backgroundColor: '#2a2a4a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  routeNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  routePrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#c9a227',
  },
  priceUsd: {
    fontSize: 14,
    color: '#888',
  },
  routeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeTime: {
    color: '#aaa',
    fontSize: 14,
  },
  routeDuration: {
    color: '#aaa',
    fontSize: 14,
  },
  airline: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
  },
  noResults: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
});

export default SearchScreen;
