import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Linking,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useUser } from '../../src/context/UserContext';
import { checkInToJourney } from '../../src/services/trainChatService';

// Mock train data - will be replaced with backend API
const MOCK_TRAINS = [
  {
    id: 'G102',
    type: 'HSR',
    departureStation: 'Shanghai',
    arrivalStation: 'Beijing South',
    departureTime: '08:00',
    arrivalTime: '12:15',
    duration: '4h 15m',
    price: 86.00,
    class: 'Second Class',
    stops: [
      { station: 'Shanghai Hongqiao', platform: 'Platform 7', time: '08:00', type: 'departure' },
      { station: 'Nanjing South', platform: 'Stop 4 mins', time: '09:24', type: 'stop' },
      { station: 'Beijing South', platform: 'Platform 12', time: '12:15', type: 'arrival' },
    ],
    coach: 'Coach 9',
  },
  {
    id: 'G108',
    type: 'HSR',
    departureStation: 'Shanghai',
    arrivalStation: 'Beijing South',
    departureTime: '09:30',
    arrivalTime: '13:50',
    duration: '4h 20m',
    price: 92.00,
    class: 'Second Class',
    stops: [
      { station: 'Shanghai Hongqiao', platform: 'Platform 3', time: '09:30', type: 'departure' },
      { station: 'Suzhou North', platform: 'Stop 3 mins', time: '10:00', type: 'stop' },
      { station: 'Nanjing South', platform: 'Stop 5 mins', time: '10:45', type: 'stop' },
      { station: 'Beijing South', platform: 'Platform 8', time: '13:50', type: 'arrival' },
    ],
    coach: 'Coach 5',
  },
  {
    id: 'G112',
    type: 'HSR',
    departureStation: 'Shanghai',
    arrivalStation: 'Beijing South',
    departureTime: '11:00',
    arrivalTime: '15:30',
    duration: '4h 30m',
    price: 86.00,
    class: 'Second Class',
    stops: [
      { station: 'Shanghai Hongqiao', platform: 'Platform 5', time: '11:00', type: 'departure' },
      { station: 'Jinan West', platform: 'Stop 4 mins', time: '13:20', type: 'stop' },
      { station: 'Beijing South', platform: 'Platform 10', time: '15:30', type: 'arrival' },
    ],
    coach: 'Coach 7',
  },
];

type SearchState = 'initial' | 'results' | 'no-results' | 'detail';

interface TrainData {
  id: string;
  type: string;
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  class: string;
  stops: Array<{
    station: string;
    platform: string;
    time: string;
    type: string;
  }>;
  coach: string;
}

interface ValidationErrors {
  from?: string;
  to?: string;
  date?: string;
}

export default function SearchScreen() {
  const router = useRouter();
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

  const handleSearch = () => {
    setApiError(false);
    
    if (!validateForm()) {
      return;
    }

    // Simulate API call - will be replaced with actual backend
    // For demo, show results if searching from Shanghai
    const searchFrom = fromStation.trim().toLowerCase();
    const searchTo = toStation.trim().toLowerCase();
    
    if (searchFrom.includes('shanghai') && searchTo.includes('beijing')) {
      setSearchResults(MOCK_TRAINS);
      setSearchState('results');
    } else if (searchFrom && searchTo) {
      // Simulate no results for other routes
      setSearchResults([]);
      setSearchState('no-results');
    }
  };

  const handleViewDetails = (train: TrainData) => {
    setSelectedTrain(train);
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
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Ionicons name="search" size={20} color="#fff" />
          <Text style={styles.searchButtonText}>Search Trains</Text>
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

      {searchResults.map((train) => (
        <View key={train.id} style={styles.trainCard}>
          <View style={styles.trainHeader}>
            <View style={styles.trainTypeBadge}>
              <Text style={styles.trainTypeText}>{train.type}</Text>
            </View>
            <Text style={styles.trainId}>{train.id}</Text>
            <View style={styles.trainPriceContainer}>
              <Text style={styles.trainPrice}>${train.price.toFixed(2)}</Text>
              <Text style={styles.trainClass}>{train.class}</Text>
            </View>
          </View>

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
            We couldn't find any scheduled services for {formatDate(departureDate)}. 
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
              <Text style={styles.trainInfoValue}>${selectedTrain.price.toFixed(2)}</Text>
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
});
