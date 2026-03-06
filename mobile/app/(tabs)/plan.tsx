import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useItinerary } from '@/src/context/ItineraryContext';

const DURATION_OPTIONS = ['3 Days', '5 Days', '7 Days'];
const TRAVEL_STYLES = [
  { id: 'solo', label: 'Solo', icon: 'person-outline' },
  { id: 'shared', label: 'Shared', icon: 'people-outline' },
  { id: 'budget', label: 'Budget', icon: 'wallet-outline' },
  { id: 'luxury', label: 'Luxury', icon: 'diamond-outline' },
];

export default function PlanScreen() {
  const { itinerary, setItinerary } = useItinerary();
  const [currentLocation, setCurrentLocation] = useState('Locating...');
  const [destination, setDestination] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('3 Days');
  const [selectedTravelStyle, setSelectedTravelStyle] = useState('shared');
  const [includeFoodTours, setIncludeFoodTours] = useState(true);
  const [includeCulturalLandmarks, setIncludeCulturalLandmarks] = useState(false);

  useEffect(() => {
    const loadCurrentLocation = async () => {
      try {
        const hasServices = await Location.hasServicesEnabledAsync();
        if (!hasServices) {
          setCurrentLocation('Location Off');
          return;
        }

        const position =
          (await Location.getLastKnownPositionAsync()) ||
          (await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }));

        if (!position) {
          setCurrentLocation('Unknown Location');
          return;
        }

        const [place] = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        // Prefer AMap reverse-geocode city/province in Chinese for routing stability.
        const amapWebKey = process.env.EXPO_PUBLIC_AMAP_WEB_API_KEY;
        if (amapWebKey) {
          const regeoRes = await fetch(
            `https://restapi.amap.com/v3/geocode/regeo?location=${position.coords.longitude},${position.coords.latitude}&extensions=base&key=${amapWebKey}`
          );
          const regeoData = await regeoRes.json();
          if (regeoData?.status === '1' && regeoData?.regeocode?.addressComponent) {
            const comp = regeoData.regeocode.addressComponent;
            const cityRaw = Array.isArray(comp.city) ? (comp.city[0] || '') : (comp.city || '');
            const city = (cityRaw || comp.province || '').replace(/市$/, '').trim();
            if (city) {
              setCurrentLocation(city);
              return;
            }
          }
        }

        // Fallback to Expo reverse-geocode if AMap response is unavailable.
        const city = (place?.city || place?.subregion || place?.region || '').replace(/市$/, '').trim();
        setCurrentLocation(city || 'Unknown Location');
      } catch {
        setCurrentLocation('Unknown Location');
      }
    };

    loadCurrentLocation();
  }, []);

  const handleGenerateItinerary = () => {
    const from = currentLocation.trim() || itinerary.origin;
    const to = destination.trim() || itinerary.destination;

    setItinerary({
      ...itinerary,
      origin: from,
      destination: to,
    });

    router.push('/iternaries' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={styles.headerTitle}>Create Itinerary</Text>

        {/* Plan with AI Section */}
        <Text style={styles.sectionTitle}>Plan with AI</Text>
        <Text style={styles.sectionSubtitle}>
          Let SilkSync curate your perfect journey.
        </Text>

        {/* Current Location Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>CURRENT LOCATION</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="location" size={20} color="#3CB371" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={currentLocation}
              onChangeText={setCurrentLocation}
              placeholder="Enter your location"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Destination Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>DESTINATION</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="location-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={destination}
              onChangeText={setDestination}
              placeholder="Where to next?"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Duration Section */}
        <View style={styles.durationContainer}>
          <View style={styles.durationHeader}>
            <Text style={styles.durationLabel}>DURATION</Text>
            <Text style={styles.durationValue}>{selectedDuration}</Text>
          </View>
          <View style={styles.durationOptions}>
            {DURATION_OPTIONS.map((duration) => (
              <TouchableOpacity
                key={duration}
                style={[
                  styles.durationButton,
                  selectedDuration === duration && styles.durationButtonSelected,
                ]}
                onPress={() => setSelectedDuration(duration)}
              >
                <Text
                  style={[
                    styles.durationButtonText,
                    selectedDuration === duration && styles.durationButtonTextSelected,
                  ]}
                >
                  {duration}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Travel Style Section */}
        <View style={styles.travelStyleContainer}>
          <Text style={styles.travelStyleLabel}>TRAVEL STYLE</Text>
          <View style={styles.travelStyleGrid}>
            {TRAVEL_STYLES.map((style) => (
              <TouchableOpacity
                key={style.id}
                style={[
                  styles.travelStyleButton,
                  selectedTravelStyle === style.id && styles.travelStyleButtonSelected,
                ]}
                onPress={() => setSelectedTravelStyle(style.id)}
              >
                <Ionicons
                  name={style.icon as any}
                  size={24}
                  color={selectedTravelStyle === style.id ? '#3CB371' : '#666'}
                />
                <Text
                  style={[
                    styles.travelStyleText,
                    selectedTravelStyle === style.id && styles.travelStyleTextSelected,
                  ]}
                >
                  {style.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Toggle Options */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="restaurant-outline" size={20} color="#666" />
              <Text style={styles.toggleLabel}>Include Food Tours</Text>
            </View>
            <Switch
              value={includeFoodTours}
              onValueChange={setIncludeFoodTours}
              trackColor={{ false: '#E0E0E0', true: '#A8E6CF' }}
              thumbColor={includeFoodTours ? '#3CB371' : '#fff'}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="business-outline" size={20} color="#666" />
              <Text style={styles.toggleLabel}>Cultural Landmarks</Text>
            </View>
            <Switch
              value={includeCulturalLandmarks}
              onValueChange={setIncludeCulturalLandmarks}
              trackColor={{ false: '#E0E0E0', true: '#A8E6CF' }}
              thumbColor={includeCulturalLandmarks ? '#3CB371' : '#fff'}
            />
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGenerateItinerary}
        >
          <Ionicons name="sparkles" size={20} color="#fff" />
          <Text style={styles.generateButtonText}>Generate AI Itinerary</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  durationContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  durationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  durationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.5,
  },
  durationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3CB371',
  },
  durationOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  durationButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#fff',
  },
  durationButtonSelected: {
    backgroundColor: '#3CB371',
    borderColor: '#3CB371',
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  durationButtonTextSelected: {
    color: '#fff',
  },
  travelStyleContainer: {
    marginBottom: 24,
  },
  travelStyleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  travelStyleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  travelStyleButton: {
    width: '47%',
    paddingVertical: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelStyleButtonSelected: {
    borderColor: '#3CB371',
    backgroundColor: '#F0FFF5',
  },
  travelStyleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginTop: 8,
  },
  travelStyleTextSelected: {
    color: '#3CB371',
  },
  toggleContainer: {
    marginBottom: 32,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3CB371',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomSpacer: {
    height: 40,
  },
});
