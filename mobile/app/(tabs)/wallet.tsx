import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '@/src/context/WalletContext';

const QUICK_AMOUNTS = [50, 100, 500];

const TRANSACTIONS = [
  {
    id: '1',
    title: 'HSR Ticket',
    date: 'Sep 12 • 09:41 AM',
    amount: -45.0,
    icon: 'train-outline',
  },
  {
    id: '2',
    title: 'Blue Bottle Coffee',
    date: 'Sep 11 • 04:20 PM',
    amount: -5.5,
    icon: 'cafe-outline',
  },
  {
    id: '3',
    title: 'Silk Road Hotel',
    date: 'Sep 10 • 11:15 AM',
    amount: -200.0,
    icon: 'bed-outline',
  },
];

export default function WalletScreen() {
  const { balance, addFunds } = useWallet();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');

  const getDepositAmount = () => {
    if (customAmount) {
      return parseFloat(customAmount) || 0;
    }
    return selectedAmount || 0;
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    if (value) {
      setSelectedAmount(null);
    }
  };

  const handleConfirmDeposit = () => {
    const amount = getDepositAmount();
    if (amount > 0) {
      setShowPaymentModal(true);
    }
  };

  const handlePaymentSubmit = () => {
    const amount = getDepositAmount();
    if (amount > 0 && cardNumber && expiryDate && cvv && cardName) {
      addFunds(amount);
      setShowPaymentModal(false);
      setCardNumber('');
      setExpiryDate('');
      setCvv('');
      setCardName('');
      setCustomAmount('');
      setSelectedAmount(100);
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted.substring(0, 19);
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Balance Section */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
          <View style={styles.balanceContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <Text style={styles.balanceAmount}>
              {balance.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>

        {/* Add Money Section */}
        <View style={styles.addMoneySection}>
          <Text style={styles.sectionLabel}>ADD MONEY</Text>
          <View style={styles.amountButtons}>
            {QUICK_AMOUNTS.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.amountButton,
                  selectedAmount === amount && styles.amountButtonSelected,
                ]}
                onPress={() => handleAmountSelect(amount)}
              >
                <Text
                  style={[
                    styles.amountButtonText,
                    selectedAmount === amount && styles.amountButtonTextSelected,
                  ]}
                >
                  ${amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Amount Input */}
          <View style={styles.customAmountContainer}>
            <Text style={styles.dollarPrefix}>$</Text>
            <TextInput
              style={styles.customAmountInput}
              placeholder="Enter custom amount"
              placeholderTextColor="#ccc"
              keyboardType="numeric"
              value={customAmount}
              onChangeText={handleCustomAmountChange}
            />
          </View>

          {/* Confirm Deposit Button */}
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmDeposit}
          >
            <Text style={styles.confirmButtonText}>Confirm Deposit</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {TRANSACTIONS.map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionLeft}>
                <View style={styles.transactionIcon}>
                  <Ionicons
                    name={transaction.icon as any}
                    size={20}
                    color="#666"
                  />
                </View>
                <View>
                  <Text style={styles.transactionTitle}>{transaction.title}</Text>
                  <Text style={styles.transactionDate}>{transaction.date}</Text>
                </View>
              </View>
              <Text style={styles.transactionAmount}>
                -${Math.abs(transaction.amount).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Payment Method</Text>
              <TouchableOpacity
                onPress={() => setShowPaymentModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.depositAmountText}>
              Deposit Amount: ${getDepositAmount().toFixed(2)}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cardholder Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="John Doe"
                placeholderTextColor="#999"
                value={cardName}
                onChangeText={setCardName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Card Number</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={19}
                value={cardNumber}
                onChangeText={(value) => setCardNumber(formatCardNumber(value))}
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.inputLabel}>Expiry Date</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="MM/YY"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={5}
                  value={expiryDate}
                  onChangeText={(value) => setExpiryDate(formatExpiryDate(value))}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="123"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  value={cvv}
                  onChangeText={setCvv}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.payButton,
                (!cardNumber || !expiryDate || !cvv || !cardName) &&
                  styles.payButtonDisabled,
              ]}
              onPress={handlePaymentSubmit}
              disabled={!cardNumber || !expiryDate || !cvv || !cardName}
            >
              <Ionicons name="lock-closed" size={18} color="#fff" />
              <Text style={styles.payButtonText}>
                Add ${getDepositAmount().toFixed(2)}
              </Text>
            </TouchableOpacity>

            <Text style={styles.secureText}>
              <Ionicons name="shield-checkmark" size={12} color="#666" /> Your
              payment information is secure
            </Text>
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  balanceSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#999',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  addMoneySection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2eb296',
    letterSpacing: 1,
    marginBottom: 16,
  },
  amountButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  amountButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  amountButtonSelected: {
    borderWidth: 2,
    borderColor: '#2eb296',
    backgroundColor: 'rgba(46, 178, 150, 0.05)',
  },
  amountButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  amountButtonTextSelected: {
    color: '#2eb296',
  },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  dollarPrefix: {
    fontSize: 16,
    color: '#999',
    marginRight: 4,
  },
  customAmountInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  confirmButton: {
    backgroundColor: '#2eb296',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2eb296',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  activitySection: {
    paddingHorizontal: 24,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2eb296',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  bottomSpacer: {
    height: 40,
  },
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  depositAmountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2eb296',
    textAlign: 'center',
    marginBottom: 24,
    padding: 12,
    backgroundColor: 'rgba(46, 178, 150, 0.1)',
    borderRadius: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2eb296',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  payButtonDisabled: {
    backgroundColor: '#ccc',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secureText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
});
