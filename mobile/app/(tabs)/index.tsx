import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWallet } from '@/src/context/WalletContext';
import * as Location from 'expo-location';

const CITY_EN_ALIAS: Record<string, string> = {
  '北京': 'Beijing',
  '北京市': 'Beijing',
  beijing: 'Beijing',
  '上海': 'Shanghai',
  '上海市': 'Shanghai',
  shanghai: 'Shanghai',
  '天津': 'Tianjin',
  '天津市': 'Tianjin',
  tianjin: 'Tianjin',
  '重庆': 'Chongqing',
  '重庆市': 'Chongqing',
  chongqing: 'Chongqing',
  '哈尔滨': 'Harbin',
  harbin: 'Harbin',
  '广州': 'Guangzhou',
  guangzhou: 'Guangzhou',
  '深圳': 'Shenzhen',
  shenzhen: 'Shenzhen',
  '杭州': 'Hangzhou',
  hangzhou: 'Hangzhou',
  '南京': 'Nanjing',
  nanjing: 'Nanjing',
  '武汉': 'Wuhan',
  wuhan: 'Wuhan',
  '成都': 'Chengdu',
  chengdu: 'Chengdu',
  '西安': "Xi'an",
  xian: "Xi'an",
  "xi'an": "Xi'an",
};

export default function HomeScreen() {
  const router = useRouter();
  const { balance, deductFunds } = useWallet();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [currentCity, setCurrentCity] = useState('Loading...');
  const [currentDistrict, setCurrentDistrict] = useState('Loading...');
  
  // Rate state
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRate = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://10.0.2.2:5001/api/convert-currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'USD', to: 'CNY', amount: 1 }),
      });
      const data = await response.json();
      if (!data.error) {
        setRate(data.converted_amount); // store the converted amount for 1 USD
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error('Error fetching rate:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRate();
    fetchUserLocation();
  }, []);

  const fetchUserLocation = async () => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setCurrentCity('Location Off');
        setCurrentDistrict('Turn on location services');
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCurrentCity('Location Denied');
        setCurrentDistrict('Enable location access');
        return;
      }

      // Try last known location first.
      let location = await Location.getLastKnownPositionAsync();

      // If no cached location exists, try current fix with fallback accuracy.
      if (!location) {
        try {
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            mayShowUserSettingsDialog: true,
          });
        } catch {
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
            mayShowUserSettingsDialog: true,
          });
        }
      }

      if (!location) {
        setCurrentCity('Location');
        setCurrentDistrict('Set emulator/device location');
        return;
      }

      const { latitude, longitude } = location.coords;
      
      // Use Amap Web API key for REST reverse geocoding
      const amapiKey = process.env.EXPO_PUBLIC_AMAP_WEB_API_KEY;
      const response = await fetch(
        `https://restapi.amap.com/v3/geocode/regeo?location=${longitude},${latitude}&extensions=base&key=${amapiKey}`
      );
      const data = await response.json();
      
      if (data.status === '1' && data.regeocode) {
        const { city, district, province } = data.regeocode.addressComponent;

        // Municipality edge case: some responses may not provide `city` directly,
        // so we fallback to `province` and normalize city display to English.
        const rawCity = Array.isArray(city) ? (city[0] || '') : (city || '');
        const fallbackCity = rawCity || province || '';
        const cityKey = String(fallbackCity).trim();
        const cityKeyNoSuffix = cityKey.replace(/市$/, '').replace(/\s+City$/i, '').trim();
        const normalizedCity =
          CITY_EN_ALIAS[cityKey] ||
          CITY_EN_ALIAS[cityKey.toLowerCase()] ||
          CITY_EN_ALIAS[cityKeyNoSuffix] ||
          CITY_EN_ALIAS[cityKeyNoSuffix.toLowerCase()] ||
          cityKeyNoSuffix;

        setCurrentCity(normalizedCity || 'Unknown');
        setCurrentDistrict(district || 'Unknown');
      } else {
        setCurrentCity('Location');
        setCurrentDistrict('Not found');
      }
    } catch {
      setCurrentCity('Location');
      setCurrentDistrict('Location unavailable');
    }
  };

  const handleAddExpense = () => {
    const amount = parseFloat(expenseAmount);
    if (amount > 0) {
      const description = expenseDescription.trim() || 'Expense';
      const success = deductFunds(amount, description);
      if (success) {
        Alert.alert(
          'Expense Recorded',
          `$${amount.toFixed(2)} has been deducted for ${description}.`,
          [{ text: 'OK' }]
        );
        setExpenseAmount('');
        setExpenseDescription('');
        setShowExpenseModal(false);
      } else {
        Alert.alert(
          'Insufficient Funds',
          'You do not have enough balance in your wallet.',
          [{ text: 'OK' }]
        );
      }
    } else {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
            <View>
                <Text style={styles.headerSubtitle}>CHINA TRAVEL</Text>
                <Text style={styles.headerTitle}>SilkSync</Text>
            </View>
            <View style={styles.headerIcons}>
                {/* <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="notifications-outline" size={24} color="#1A1A1A" />
                </TouchableOpacity> */}
                <TouchableOpacity 
                  style={styles.profileButton}
                  onPress={() => router.push("/(tabs)/profile")}
                  >
                     <View style={styles.profileAvatar}>
                        <Ionicons name="person" size={20} color="#2DD4BF" />
                     </View>
                </TouchableOpacity>
            </View>
        </View>

        {/* Budget Card */}
        <View style={styles.card}>
            <View style={styles.budgetMain}>
                <Text style={styles.currencySymbol}>$</Text>
                <Text style={styles.balanceMain}>{balance.toLocaleString('en-US', { maximumFractionDigits: 2 })}</Text>
                <Text style={styles.balanceSecondary}> / ¥{(balance * 7.2).toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
            </View>
        </View>

        {/* Location Section */}
        <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Current Location: {currentCity}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/map' as any)}>
                <Text style={styles.expandLink}>EXPAND MAP</Text>
            </TouchableOpacity>
        </View>
        
        <View style={styles.mapCard}>
             <View style={styles.mapPlaceholder}>
                 {/* Placeholder for map graphic */}
                 <View style={styles.mapGridLineHorizontal} />
                 <View style={styles.mapGridLineVertical} />
                 <Ionicons name="location" size={32} color="#2DD4BF" style={styles.mapPinIcon} />
             </View>
             <View style={styles.locationOverlay}>
                <Text style={styles.locationLabel}>CURRENT DISTRICT</Text>
                <Text style={styles.locationValue}>{currentDistrict}</Text>
             </View>
        </View>

        {/* Core Functions */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Core Functions</Text>
        <View style={styles.functionsGrid}>
            <TouchableOpacity style={styles.functionCard}>
                <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="train-outline" size={28} color="#0EA5E9" />
                </View>
                <Text style={styles.functionTitle}>Next HSR Train</Text>
                <Text style={styles.functionSubtitle}>G102 • 14:45</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.functionCard} onPress={() => setShowExpenseModal(true)}>
                <View style={[styles.iconBox, { backgroundColor: '#D1FAE5' }]}>
                    <Ionicons name="cart-outline" size={28} color="#10B981" />
                </View>
                <Text style={styles.functionTitle}>Add Expense</Text>
                <Text style={styles.functionSubtitle}>Tap to record</Text>
            </TouchableOpacity>
        </View>

        {/* Second Row of Core Functions */}
        <View style={styles.functionsGrid}>
            <TouchableOpacity
              style={styles.functionCard}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/search' as any,
                  params: {
                    from: currentCity,
                  },
                })
              }
            >
                <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="search-outline" size={28} color="#F59E0B" />
                </View>
                <Text style={styles.functionTitle}>Train Search</Text>
                <Text style={styles.functionSubtitle}>Find routes</Text>
            </TouchableOpacity>
            
            <View style={styles.functionCardPlaceholder} />
        </View>

        {/* Exchange Rate */}
        <View style={styles.rateCard}>
            <View style={styles.rateContent}>
                 <View style={styles.refreshIconWrapper}>
                    <Ionicons name="sync" size={20} color="#64748B" />
                 </View>
                 <Text style={styles.rateText}>
                  {loading ? 'Loading...' : `1 USD = ${rate} CNY`}
                 </Text>
            </View>
            <TouchableOpacity onPress={fetchRate}>
                <Text style={styles.liveRateLink}>LIVE RATE</Text>
            </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Add Expense Modal */}
      <Modal
        visible={showExpenseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowExpenseModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Expense</Text>
              <TouchableOpacity
                onPress={() => setShowExpenseModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Enter the amount you spent and what it was for. This will be deducted from your wallet balance.
            </Text>

            <View style={styles.expenseInputWrapper}>
              <Text style={styles.inputLabel}>Amount</Text>
              <View style={styles.expenseInputContainer}>
                <Text style={styles.dollarPrefix}>$</Text>
                <TextInput
                  style={styles.expenseInput}
                  placeholder="0.00"
                  placeholderTextColor="#ccc"
                  keyboardType="numeric"
                  value={expenseAmount}
                  onChangeText={setExpenseAmount}
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.expenseInputWrapper}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="e.g. Lunch, Taxi, Souvenirs"
                placeholderTextColor="#9CA3AF"
                value={expenseDescription}
                onChangeText={setExpenseDescription}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.addExpenseButton,
                !expenseAmount && styles.addExpenseButtonDisabled,
              ]}
              onPress={handleAddExpense}
              disabled={!expenseAmount}
            >
              <Text style={styles.addExpenseButtonText}>Record Expense</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  profileButton: {
    padding: 4,
    backgroundColor: '#CCFBF1',
    borderRadius: 20,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Card Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  percentBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0EA5E9',
  },
  budgetMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0F172A',
    marginRight: 4,
  },
  balanceMain: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  balanceSecondary: {
    fontSize: 18,
    color: '#64748B',
    marginLeft: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2DD4BF',
    borderRadius: 4,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  // Map Section
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  expandLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2DD4BF',
  },
  mapCard: {
    height: 180,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#F1F5F9', // Light gray background
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapGridLineHorizontal: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#E2E8F0',
    top: '50%',
  },
  mapGridLineVertical: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: '#E2E8F0',
    left: '50%',
  },
  mapPinIcon: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
  },
  locationOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  locationLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  locationValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },

  // Core Functions
  functionsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    marginBottom: 24,
  },
  functionCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  functionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  functionSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },

  // Rate Card
  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  rateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshIconWrapper: {
    // padding: 4,
  },
  rateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  liveRateLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2DD4BF',
  },

  // Placeholder for grid alignment
  functionCardPlaceholder: {
    flex: 1,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
    lineHeight: 20,
  },
  expenseInputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  expenseInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2DD4BF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F0FDFA',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  dollarPrefix: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 8,
  },
  expenseInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
  },
  addExpenseButton: {
    backgroundColor: '#2DD4BF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addExpenseButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  addExpenseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  locationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
