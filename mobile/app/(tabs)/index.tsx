import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWallet } from '@/src/context/WalletContext';

export default function HomeScreen() {
  const router = useRouter();
  const { deductFunds } = useWallet();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  
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
  }, []);

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
                <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="notifications-outline" size={24} color="#1A1A1A" />
                </TouchableOpacity>
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
            <View style={styles.budgetHeader}>
                <Text style={styles.cardLabel}>Total Budget Remaining</Text>
                <View style={styles.percentBadge}>
                    <Text style={styles.percentText}>65% SPENT</Text>
                </View>
            </View>
            <View style={styles.budgetMain}>
                <Text style={styles.currencySymbol}>$</Text>
                <Text style={styles.balanceMain}>1,240</Text>
                <Text style={styles.balanceSecondary}> / ¥8,980</Text>
            </View>
            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: '65%' }]} />
            </View>
            <View style={styles.budgetFooter}>
                <Text style={styles.footerText}>Spent: ¥16,675</Text>
                <Text style={styles.footerText}>Daily Avg: ¥550</Text>
            </View>
        </View>

        {/* Location Section */}
        <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Current Location: Shanghai</Text>
            <TouchableOpacity>
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
                <Text style={styles.locationValue}>Huangpu District</Text>
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
            <TouchableOpacity style={styles.functionCard} onPress={() => router.push('/search' as any)}>
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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
});
