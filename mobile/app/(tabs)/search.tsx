import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUser } from '../../src/context/UserContext';
import { checkInToJourney } from '../../src/services/trainChatService';

const BACKEND_BASE_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://127.0.0.1:5001');
  // Android emulator cannot call localhost directly.

type SearchState = 'initial' | 'results' | 'no-results' | 'detail';

interface TrainData {
  id: string;
  type: string;
  departureStation: string;
  departureStationZh?: string;
  arrivalStation: string;
  arrivalStationZh?: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number | null;
  class: string;
  stops: {
    station: string;
    platform: string;
    time: string;
    type: string;
  }[];
  coach: string;
}

interface ValidationErrors {
  from?: string;
  to?: string;
  date?: string;
}

interface StationLabel {
  en?: string;
  zh?: string;
}

interface RouteTrainApi {
  train_code?: string;
  departure?: string;
  arrival?: string;
  duration?: string;
  from_station?: StationLabel;
  to_station?: StationLabel;
  seats?: {
    class_en?: string;
    availability?: string;
  }[];
}

interface RouteResponseApi {
  trains?: RouteTrainApi[];
}

interface StopsResponseApi {
  stations?: {
    station_name?: string;
    start_time?: string;
    arrive_time?: string;
    stopover_time?: string;
  }[];
}

interface PriceRowApi {
  train_code?: string;
  start_time?: string;
  prices?: Record<string, string>;
}

interface PriceResponseApi {
  data?: PriceRowApi[];
}
// The backend response shape is not identical to our UI card shape.
// These types document backend payloads so we can map them safely into TrainData.

const STATION_ALIASES: Record<string, string> = {
  beijing: '北京',
  shanghai: '上海',
  guangzhou: '广州',
  shenzhen: '深圳',
  hangzhou: '杭州',
  nanjing: '南京',
  chengdu: '成都',
  wuhan: '武汉',
  xian: '西安',
  "xi'an": '西安',
};

const formatDateForApi = (date: Date): string => {
  // Use local date to avoid UTC day-shift from toISOString().
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildStationCandidates = (raw: string): string[] => {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const noCountry = trimmed
    .replace(/,\s*china$/i, '')
    .replace(/\s+china$/i, '')
    .trim();

  const key = noCountry.toLowerCase();
  const alias = STATION_ALIASES[key];

  return Array.from(new Set([trimmed, noCountry, alias].filter(Boolean) as string[]));
};

const pickLowestPrice = (prices?: Record<string, string>): number | null => {
  if (!prices) return null;
  const values = Object.values(prices)
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (values.length === 0) return null;
  return Math.min(...values);
};

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string; to?: string }>();
  const { user, profile } = useUser();
  
  const [searchState, setSearchState] = useState<SearchState>('initial');
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [departureDate, setDepartureDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchResults, setSearchResults] = useState<TrainData[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<TrainData | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [apiError, setApiError] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [usdToCnyRate, setUsdToCnyRate] = useState(7.2); // Fallback exchange rate of 7.2 in case API call fails.

  useEffect(() => {
    const fromParam = typeof params.from === 'string' ? params.from.trim() : '';
    const toParam = typeof params.to === 'string' ? params.to.trim() : '';

    if (fromParam) {
      setFromStation(fromParam);
    }
    if (toParam) {
      setToStation(toParam);
    }
  }, [params.from, params.to]);

  useEffect(() => {
    const fetchUsdToCnyRate = async () => {
      try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/convert-currency`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: 'USD', to: 'CNY', amount: 1 }),
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const rate = Number(data?.converted_amount);
        if (Number.isFinite(rate) && rate > 0) {
          setUsdToCnyRate(rate);
        }
      } catch {
        // Keep default fallback rate if API is unavailable.
      }
    };

    fetchUsdToCnyRate();
  }, []);

  const formatPriceDisplay = (priceCny: number | null) => {
    if (priceCny === null) {
      return { cny: 'N/A', usd: '' };
    }

    const usd = priceCny / usdToCnyRate;
    return {
      cny: `¥${priceCny.toFixed(2)}`,
      usd: `$${usd.toFixed(2)}`,
    };
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    if (!fromStation.trim()) {
      newErrors.from = 'Please enter a departure station';
    }
    if (!toStation.trim()) {
      newErrors.to = 'Please enter a destination';
    }
    if (fromStation.trim().toLowerCase() === toStation.trim().toLowerCase() && fromStation.trim()) {
      newErrors.to = 'Destination must be different from departure';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = async () => {
    setApiError(false);
    
    if (!validateForm()) {
      return;
    }

    setIsSearching(true);

    try {
      const formattedDate = formatDateForApi(departureDate);
      // Backend expects YYYY-MM-DD, matching Python API format.
      const fromCandidates = buildStationCandidates(fromStation);
      const toCandidates = buildStationCandidates(toStation);

      let trains: RouteTrainApi[] = [];

      // Try raw input first, then normalized / Chinese aliases.
      // This handles inputs like "Beijing, China" with a backend expecting "北京".
      for (const fromCandidate of fromCandidates) {
        for (const toCandidate of toCandidates) {
          const url = `${BACKEND_BASE_URL}/api/trains/route?from_station=${encodeURIComponent(
            fromCandidate
          )}&to_station=${encodeURIComponent(toCandidate)}&train_date=${formattedDate}`;

          const response = await fetch(url);
          if (!response.ok) {
            continue;
          }

          const data = (await response.json()) as RouteResponseApi;
          const current = Array.isArray(data.trains) ? data.trains : [];

          if (current.length > 0) {
            trains = current;
            break;
          }
        }

        if (trains.length > 0) {
          break;
        }
      }

      // Try to get full price table in one call (faster than per-train calls).
      const priceUrl = `${BACKEND_BASE_URL}/api/trains/price?from_station=${encodeURIComponent(
        fromStation.trim()
      )}&to_station=${encodeURIComponent(toStation.trim())}&train_date=${formattedDate}`;

      const priceMapByCodeAndTime = new Map<string, number>();
      const priceMapByCode = new Map<string, number>();

      try {
        const priceRes = await fetch(priceUrl);
        if (priceRes.ok) {
          const priceData = (await priceRes.json()) as PriceResponseApi;
          const priceRows = Array.isArray(priceData.data) ? priceData.data : [];

          for (const row of priceRows) {
            const code = row.train_code || '';
            const startTime = row.start_time || '';
            const price = pickLowestPrice(row.prices);
            if (!code || price === null) continue;

            priceMapByCode.set(code, price);
            priceMapByCodeAndTime.set(`${code}__${startTime}`, price);
          }
        }
      } catch {
        // Keep search usable even if price lookup fails.
      }

      // Map backend train objects -> UI cards.
      // We keep display robust by providing fallbacks for missing fields.

      const mappedResults: TrainData[] = trains.map((train, index) => {
        const preferredSeat =
          train.seats?.find((s) => s.availability && s.availability !== 'Not Available') ||
          train.seats?.[0];

        const departureEn = train.from_station?.en || train.from_station?.zh || fromStation.trim();
        const arrivalEn = train.to_station?.en || train.to_station?.zh || toStation.trim();

        const priceKey = `${train.train_code || ''}__${train.departure || ''}`;
        const matchedPrice =
          priceMapByCodeAndTime.get(priceKey) ||
          priceMapByCode.get(train.train_code || '') ||
          null;

        return {
          id: train.train_code || `TRAIN-${index + 1}`,
          type: (train.train_code || '').startsWith('G') ? 'HSR' : 'Rail',
          departureStation: departureEn,
          departureStationZh: train.from_station?.zh,
          arrivalStation: arrivalEn,
          arrivalStationZh: train.to_station?.zh,
          departureTime: train.departure || '--:--',
          arrivalTime: train.arrival || '--:--',
          duration: train.duration || '--',
          price: matchedPrice,
          class: preferredSeat?.class_en || 'Standard',
          coach: 'TBD',
          stops: [
            // Placeholder stops for list view.
            // Full stop sequence is fetched in handleViewDetails().
            {
              station: departureEn,
              platform: 'Departure',
              time: train.departure || '--:--',
              type: 'departure',
            },
            {
              station: arrivalEn,
              platform: 'Arrival',
              time: train.arrival || '--:--',
              type: 'arrival',
            },
          ],
        };
      });

      if (mappedResults.length > 0) {
        setSearchResults(mappedResults);
        setSearchState('results');
      } else {
        // Empty success response => no trains for this route/date.
        setSearchResults([]);
        setSearchState('no-results');
      }
    } catch (error) {
      console.error('Train search error:', error);
      setApiError(true);
      setSearchResults([]);
      setSearchState('initial');
      // Keep user on form and show recoverable error UX.
      Alert.alert('Search Failed', 'Could not fetch train data. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewDetails = async (train: TrainData) => {
    try {
      const formattedDate = formatDateForApi(departureDate);
      const fromForApi = train.departureStationZh || train.departureStation;
      const toForApi = train.arrivalStationZh || train.arrivalStation;

      const url = `${BACKEND_BASE_URL}/api/trains/stops/${encodeURIComponent(
        train.id
      )}?from_station=${encodeURIComponent(fromForApi)}&to_station=${encodeURIComponent(
        toForApi
      )}&train_date=${formattedDate}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Stops failed (${response.status})`);
      }

      const data = (await response.json()) as StopsResponseApi;
      const stopRows = (data.stations || []).map((stop, index, arr) => ({
        station: stop.station_name || `Stop ${index + 1}`,
        platform: stop.stopover_time || 'Stop',
        time: stop.start_time || stop.arrive_time || '--:--',
        type: index === 0 ? 'departure' : index === arr.length - 1 ? 'arrival' : 'stop',
      }));
      // Convert stop list to timeline format used by detail UI.

      setSelectedTrain({
        ...train,
        stops: stopRows.length > 0 ? stopRows : train.stops,
      });
    } catch {
      // If stops request fails, still open detail page with base train data.
      setSelectedTrain(train);
    }

    setSearchState('detail');
  };

  const handleBackToResults = () => {
    setSelectedTrain(null);
    setSearchState('results');
  };

  const handleBackToSearch = () => {
    setSearchState('initial');
    setSearchResults([]);
    setSelectedTrain(null);
  };

  const handleBookTicket = () => {
    // Open 12306 website for actual ticket booking
    const url = 'https://www.12306.cn/index/';
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open 12306 website');
      }
    });
  };

  const handleCheckIn = async (train: TrainData) => {
    if (!user || !profile) {
      Alert.alert(
        'Login Required',
        'Please sign in to check in to a journey',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth') },
        ]
      );
      return;
    }

    setCheckingIn(true);

    try {
      // Format date as YYYY-MM-DD
      const formattedDate = departureDate.toISOString().split('T')[0];
      
      const checkInData = {
        userId: user.uid,
        userName: profile.displayName,
        userPhoto: profile.photoURL,
        trainNumber: train.id,
        departureDate: formattedDate,
        departureStation: train.departureStation,
        arrivalStation: train.arrivalStation,
        socialIntent: profile.socialIntent,
      };

      const response = await checkInToJourney(checkInData);

      if (response.success) {
        // Navigate to chat room with journey details
        const params = new URLSearchParams({
          trainNumber: train.id,
          journeyId: response.journeyId,
          departureStation: train.departureStation,
          arrivalStation: train.arrivalStation,
        });
        const chatRoomPath = `/(tabs)/chatRoom?${params.toString()}`;
        // @ts-expect-error - Route registered in _layout but not in type definitions
        router.push(chatRoomPath);
      }
    } catch (error) {
      console.error('Check-in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unable to check in to this journey';
      Alert.alert(
        'Check-In Failed',
        errorMessage + '. Please ensure the backend server is running.',
        [{ text: 'OK' }]
      );
    } finally {
      setCheckingIn(false);
    }
  };

  const handleTryDate = (daysOffset: number) => {
    const newDate = new Date(departureDate);
    newDate.setDate(newDate.getDate() + daysOffset);
    setDepartureDate(newDate);
    handleSearch();
  };

  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDepartureDate(selectedDate);
    }
  };

  // Initial Search Form
  const renderSearchForm = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Book Your Journey</Text>
      </View>

      <View style={styles.formSection}>
        {/* From Station */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Departure Station</Text>
          <View style={[styles.inputContainer, errors.from && styles.inputError]}>
            <Ionicons 
              name="location" 
              size={20} 
              color={errors.from ? '#EF4444' : '#2DD4BF'} 
              style={styles.inputIcon} 
            />
            <TextInput
              style={styles.input}
              placeholder="Enter origin"
              placeholderTextColor="#9CA3AF"
              value={fromStation}
              onChangeText={(text) => {
                setFromStation(text);
                if (errors.from) setErrors({ ...errors, from: undefined });
              }}
            />
            {errors.from && (
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
            )}
          </View>
          {errors.from && <Text style={styles.errorText}>{errors.from}</Text>}
        </View>

        {/* Swap Button */}
        <TouchableOpacity 
          style={styles.swapButton}
          onPress={() => {
            const temp = fromStation;
            setFromStation(toStation);
            setToStation(temp);
          }}
        >
          <Ionicons name="swap-vertical" size={20} color="#2DD4BF" />
        </TouchableOpacity>

        {/* To Station */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Arrival Station</Text>
          <View style={[styles.inputContainer, errors.to && styles.inputError]}>
            <Ionicons 
              name="location-outline" 
              size={20} 
              color={errors.to ? '#EF4444' : '#10B981'} 
              style={styles.inputIcon} 
            />
            <TextInput
              style={styles.input}
              placeholder="Enter destination"
              placeholderTextColor="#9CA3AF"
              value={toStation}
              onChangeText={(text) => {
                setToStation(text);
                if (errors.to) setErrors({ ...errors, to: undefined });
              }}
            />
            {errors.to && (
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
            )}
          </View>
          {errors.to && <Text style={styles.errorText}>{errors.to}</Text>}
        </View>

        {/* Date Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Travel Date</Text>
          <TouchableOpacity 
            style={styles.inputContainer}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#64748B" style={styles.inputIcon} />
            <Text style={styles.dateText}>{formatDate(departureDate)}</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={departureDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {/* Search Button */}
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={isSearching}>
          {isSearching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="search" size={20} color="#fff" />
          )}
          <Text style={styles.searchButtonText}>{isSearching ? 'Searching...' : 'Search Trains'}</Text>
        </TouchableOpacity>
      </View>

      {/* API Error Banner */}
      {apiError && (
        <View style={styles.errorBanner}>
          <View style={styles.errorBannerContent}>
            <Ionicons name="wifi-outline" size={20} color="#EF4444" />
            <Text style={styles.errorBannerText}>API Connection Error</Text>
          </View>
          <TouchableOpacity onPress={handleSearch}>
            <Text style={styles.retryText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  // Search Results List
  const renderSearchResults = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.resultsHeader}>
        <TouchableOpacity onPress={handleBackToSearch} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.resultsTitle}>HSR Available Trains</Text>
        <View style={styles.resultsCount}>
          <Text style={styles.resultsCountText}>{searchResults.length} results found</Text>
        </View>
      </View>

      {searchResults.map((train, index) => (
        <View key={`${train.id}-${train.departureTime}-${index}`} style={styles.trainCard}>
          {(() => {
            const displayPrice = formatPriceDisplay(train.price);
            return (
          <View style={styles.trainHeader}>
            <View style={styles.trainTypeBadge}>
              <Text style={styles.trainTypeText}>{train.type}</Text>
            </View>
            <Text style={styles.trainId}>{train.id}</Text>
            <View style={styles.trainPriceContainer}>
              <Text style={styles.trainPrice}>{displayPrice.cny}</Text>
              {displayPrice.usd ? <Text style={styles.trainPriceUsd}>{displayPrice.usd}</Text> : null}
              <Text style={styles.trainClass}>{train.class}</Text>
            </View>
          </View>
            );
          })()}

          <View style={styles.trainRoute}>
            <View style={styles.trainTimeSection}>
              <Text style={styles.trainTime}>{train.departureTime}</Text>
              <Text style={styles.trainStation}>{train.departureStation}</Text>
            </View>
            <View style={styles.trainDuration}>
              <Text style={styles.durationText}>{train.duration}</Text>
              <View style={styles.durationLine}>
                <View style={styles.durationDot} />
                <View style={styles.durationTrack} />
                <View style={styles.durationDot} />
              </View>
            </View>
            <View style={styles.trainTimeSection}>
              <Text style={styles.trainTime}>{train.arrivalTime}</Text>
              <Text style={styles.trainStation}>{train.arrivalStation}</Text>
            </View>
          </View>

          <View style={styles.trainActions}>
            <TouchableOpacity 
              style={styles.detailsButton}
              onPress={() => handleViewDetails(train)}
            >
              <Text style={styles.detailsButtonText}>Details</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.joinTripButton}
              onPress={() => handleCheckIn(train)}
              disabled={checkingIn}
            >
              {checkingIn ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.joinTripButtonText}>Join Trip</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  // No Results Found
  const renderNoResults = () => {
    const nextDay = new Date(departureDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayAfter = new Date(departureDate);
    dayAfter.setDate(dayAfter.getDate() + 2);

    return (
      <View style={styles.noResultsContainer}>
        <TouchableOpacity onPress={handleBackToSearch} style={styles.backButtonAbsolute}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.noResultsContent}>
          <View style={styles.noResultsIcon}>
            <Ionicons name="train-outline" size={48} color="#2DD4BF" />
          </View>
          <Text style={styles.noResultsTitle}>No trains found for this date</Text>
          <Text style={styles.noResultsSubtitle}>
            We could not find any scheduled services for {formatDate(departureDate)}. 
            Try searching for a different day or checking nearby stations.
          </Text>

          <View style={styles.alternateDatesRow}>
            <TouchableOpacity 
              style={styles.alternateDateButton}
              onPress={() => handleTryDate(1)}
            >
              <Text style={styles.alternateDateText}>Try {formatDate(nextDay).split(',')[0]}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.alternateDateButton}
              onPress={() => handleTryDate(2)}
            >
              <Text style={styles.alternateDateText}>Try {formatDate(dayAfter).split(',')[0]}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.viewScheduleButton} onPress={handleBackToSearch}>
            <Text style={styles.viewScheduleText}>View Schedule</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Train Detail View
  const renderTrainDetail = () => {
    if (!selectedTrain) return null;
    const detailPrice = formatPriceDisplay(selectedTrain.price);

    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={handleBackToResults} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle}>Train Search</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailTitleRow}>
            <View>
              <Text style={styles.detailTrainId}>{selectedTrain.id}</Text>
              <Text style={styles.detailTrainName}>Harmony Express</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>On Time</Text>
            </View>
          </View>

          {/* Journey Stops */}
          <View style={styles.journeyStops}>
            {selectedTrain.stops.map((stop, index) => (
              <View key={index} style={styles.stopRow}>
                <View style={styles.stopIndicator}>
                  <View style={[
                    styles.stopDot,
                    stop.type === 'departure' && styles.stopDotDeparture,
                    stop.type === 'arrival' && styles.stopDotArrival,
                  ]} />
                  {index < selectedTrain.stops.length - 1 && (
                    <View style={styles.stopLine} />
                  )}
                </View>
                <View style={styles.stopInfo}>
                  <Text style={styles.stopStation}>{stop.station}</Text>
                  <Text style={styles.stopPlatform}>{stop.platform}</Text>
                </View>
                <Text style={styles.stopTime}>{stop.time}</Text>
                <Text style={styles.stopType}>
                  {stop.type === 'departure' ? 'Departure' : stop.type === 'arrival' ? 'Arrival' : ''}
                </Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.detailActionButtons}>
            <TouchableOpacity 
              style={styles.bookTicketButton} 
              onPress={handleBookTicket}
            >
              <Ionicons name="cart" size={20} color="#fff" />
              <Text style={styles.bookTicketButtonText}>Book Ticket</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.joinCommunityButton} 
              onPress={() => handleCheckIn(selectedTrain)}
              disabled={checkingIn}
            >
              {checkingIn ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="people" size={20} color="#fff" />
                  <Text style={styles.joinCommunityButtonText}>Join Community</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.ticketNote}>
            Book tickets on 12306 • Join fellow travelers in chat
          </Text>

          {/* Train Info */}
          <View style={styles.trainInfoRow}>
            <View style={styles.trainInfoItem}>
              <Ionicons name="pricetag-outline" size={24} color="#64748B" />
              <Text style={styles.trainInfoLabel}>Price</Text>
              <Text style={styles.trainInfoValue}>{detailPrice.cny}</Text>
              {detailPrice.usd ? <Text style={styles.trainInfoSubValue}>{detailPrice.usd}</Text> : null}
            </View>
            <View style={styles.trainInfoItem}>
              <Ionicons name="grid-outline" size={24} color="#64748B" />
              <Text style={styles.trainInfoLabel}>Dining Car</Text>
              <Text style={styles.trainInfoValue}>{selectedTrain.coach}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {searchState === 'initial' && renderSearchForm()}
      {searchState === 'results' && renderSearchResults()}
      {searchState === 'no-results' && renderNoResults()}
      {searchState === 'detail' && renderTrainDetail()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Header Section
  headerSection: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Form Section
  formSection: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  swapButton: {
    alignSelf: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -8,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2DD4BF',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#991B1B',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2DD4BF',
  },

  // Results Header
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  resultsTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  resultsCount: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },

  // Train Card
  trainCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  trainTypeBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  trainTypeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  trainId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  trainPriceContainer: {
    alignItems: 'flex-end',
  },
  trainPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2DD4BF',
  },
  trainPriceUsd: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  trainClass: {
    fontSize: 12,
    color: '#64748B',
  },
  trainRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  trainTimeSection: {
    flex: 1,
  },
  trainTime: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  trainStation: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  trainDuration: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  durationText: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  durationLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2DD4BF',
  },
  durationTrack: {
    width: 40,
    height: 2,
    backgroundColor: '#E2E8F0',
  },
  trainActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailsButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  joinTripButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2DD4BF',
    gap: 6,
  },
  joinTripButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // No Results
  noResultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  backButtonAbsolute: {
    padding: 4,
    marginTop: 16,
  },
  noResultsContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  noResultsIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  alternateDatesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  alternateDateButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2DD4BF',
  },
  alternateDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2DD4BF',
  },
  viewScheduleButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewScheduleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },

  // Detail View
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  detailHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  detailTrainId: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2DD4BF',
  },
  detailTrainName: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  journeyStops: {
    marginBottom: 24,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 60,
  },
  stopIndicator: {
    alignItems: 'center',
    width: 24,
    marginRight: 12,
  },
  stopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#CBD5E1',
    borderWidth: 2,
    borderColor: '#fff',
  },
  stopDotDeparture: {
    backgroundColor: '#2DD4BF',
  },
  stopDotArrival: {
    backgroundColor: '#2DD4BF',
  },
  stopLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    minHeight: 40,
  },
  stopInfo: {
    flex: 1,
  },
  stopStation: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  stopPlatform: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  stopTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    width: 50,
    textAlign: 'right',
  },
  stopType: {
    fontSize: 11,
    color: '#64748B',
    width: 60,
    textAlign: 'right',
  },
  detailActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  bookTicketButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  bookTicketButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  joinCommunityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2DD4BF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  joinCommunityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2DD4BF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  checkInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  ticketNote: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 24,
  },
  trainInfoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  trainInfoItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  trainInfoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    marginBottom: 4,
  },
  trainInfoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  trainInfoSubValue: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});
