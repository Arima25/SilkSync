import React, { useEffect, useState } from 'react';
import { StyleSheet, Alert, Platform, Linking, Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUser } from '../../src/context/UserContext';
import { checkInToJourney } from '../../src/services/trainChatService';
import { logger } from '@/lib/logger';
import {
  SearchState,
  TrainData,
  ValidationErrors,
  RouteTrainApi,
  RouteResponseApi,
  StopsResponseApi,
  PriceResponseApi,
} from '@/components/search/searchTypes';
import { formatDateForApi, buildStationCandidates, pickLowestPrice } from '@/components/search/searchUtils';
import { SearchForm } from '@/components/search/SearchForm';
import { SearchResults } from '@/components/search/SearchResults';
import { NoResults } from '@/components/search/NoResults';
import { TrainDetail } from '@/components/search/TrainDetail';

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;

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
  const [pendingCheckInTrain, setPendingCheckInTrain] = useState<TrainData | null>(null);
  const [coachInput, setCoachInput] = useState('');
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
      logger.error('Train search error:', error);
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

    // Ask which coach they're in before checking in -- this is what powers
    // same-carriage matching in the chat room's traveler list.
    setCoachInput('');
    setPendingCheckInTrain(train);
  };

  const performCheckIn = async (train: TrainData, coach?: string) => {
    if (!user || !profile) return;

    setPendingCheckInTrain(null);
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
        ...(coach ? { coach } : {}),
      };

      const response = await checkInToJourney(checkInData);

      if (response.success) {
        // Navigate to chat room with journey details
        const chatParams = new URLSearchParams({
          trainNumber: train.id,
          journeyId: response.journeyId,
          departureStation: train.departureStation,
          arrivalStation: train.arrivalStation,
          departureDate: formattedDate,
          departureTime: train.departureTime,
          ...(train.departureStationZh ? { departureStationZh: train.departureStationZh } : {}),
          ...(train.arrivalStationZh ? { arrivalStationZh: train.arrivalStationZh } : {}),
          ...(train.price !== null ? { price: String(train.price) } : {}),
        });
        const chatRoomPath = `/(tabs)/chatRoom?${chatParams.toString()}`;
        // @ts-expect-error - Route registered in _layout but not in type definitions
        router.push(chatRoomPath);
      }
    } catch (error) {
      logger.error('Check-in error:', error);
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

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDepartureDate(selectedDate);
    }
  };

  const handleChangeFrom = (text: string) => {
    setFromStation(text);
    if (errors.from) setErrors({ ...errors, from: undefined });
  };

  const handleChangeTo = (text: string) => {
    setToStation(text);
    if (errors.to) setErrors({ ...errors, to: undefined });
  };

  const handleSwap = () => {
    const temp = fromStation;
    setFromStation(toStation);
    setToStation(temp);
  };

  return (
    <SafeAreaView style={styles.container}>
      {searchState === 'initial' && (
        <SearchForm
          fromStation={fromStation}
          toStation={toStation}
          errors={errors}
          departureDate={departureDate}
          showDatePicker={showDatePicker}
          isSearching={isSearching}
          apiError={apiError}
          onChangeFrom={handleChangeFrom}
          onChangeTo={handleChangeTo}
          onSwap={handleSwap}
          onOpenDatePicker={() => setShowDatePicker(true)}
          onDateChange={onDateChange}
          onSearch={handleSearch}
        />
      )}
      {searchState === 'results' && (
        <SearchResults
          searchResults={searchResults}
          checkingIn={checkingIn}
          formatPriceDisplay={formatPriceDisplay}
          onBack={handleBackToSearch}
          onViewDetails={handleViewDetails}
          onCheckIn={handleCheckIn}
        />
      )}
      {searchState === 'no-results' && (
        <NoResults departureDate={departureDate} onBack={handleBackToSearch} onTryDate={handleTryDate} />
      )}
      {searchState === 'detail' && selectedTrain && (
        <TrainDetail
          selectedTrain={selectedTrain}
          checkingIn={checkingIn}
          formatPriceDisplay={formatPriceDisplay}
          onBack={handleBackToResults}
          onBookTicket={handleBookTicket}
          onCheckIn={handleCheckIn}
        />
      )}

      <Modal
        visible={pendingCheckInTrain !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingCheckInTrain(null)}
      >
        <View style={styles.coachModalOverlay}>
          <View style={styles.coachModalCard}>
            <Text style={styles.coachModalTitle}>Which coach are you in?</Text>
            <Text style={styles.coachModalSubtitle}>
              Optional -- lets us surface other travelers in your exact carriage once you're checked in.
            </Text>
            <TextInput
              style={styles.coachModalInput}
              placeholder="e.g. 05"
              placeholderTextColor="#94A3B8"
              value={coachInput}
              onChangeText={setCoachInput}
              keyboardType="default"
              maxLength={10}
              autoFocus
            />
            <View style={styles.coachModalActions}>
              <TouchableOpacity
                style={styles.coachModalSkipButton}
                onPress={() => pendingCheckInTrain && performCheckIn(pendingCheckInTrain)}
              >
                <Text style={styles.coachModalSkipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.coachModalConfirmButton}
                onPress={() => pendingCheckInTrain && performCheckIn(pendingCheckInTrain, coachInput.trim() || undefined)}
              >
                <Text style={styles.coachModalConfirmText}>Check In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  coachModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  coachModalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
  },
  coachModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  coachModalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  coachModalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 20,
  },
  coachModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  coachModalSkipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  coachModalSkipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  coachModalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#2DD4BF',
  },
  coachModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
