/**
 * Credit Card Payment Component
 * 
 * This component is separated for future use when payment functionality is needed.
 * Currently not integrated into the app, but preserved for later implementation.
 */

import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CreditCardPaymentProps {
  visible: boolean;
  onClose: () => void;
  onPaymentSubmit: (cardDetails: CardDetails) => void;
  depositAmount: number;
}

interface CardDetails {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardName: string;
}

export default function CreditCardPayment({
  visible,
  onClose,
  onPaymentSubmit,
  depositAmount,
}: CreditCardPaymentProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');

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

  const handleSubmit = () => {
    if (cardNumber && expiryDate && cvv && cardName) {
      onPaymentSubmit({
        cardNumber,
        expiryDate,
        cvv,
        cardName,
      });
      // Reset form
      setCardNumber('');
      setExpiryDate('');
      setCvv('');
      setCardName('');
    }
  };

  const isFormValid = cardNumber && expiryDate && cvv && cardName;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Payment Method</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={styles.depositAmountText}>
            Deposit Amount: ${depositAmount.toFixed(2)}
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
            style={[styles.payButton, !isFormValid && styles.payButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isFormValid}
          >
            <Ionicons name="lock-closed" size={18} color="#fff" />
            <Text style={styles.payButtonText}>
              Add ${depositAmount.toFixed(2)}
            </Text>
          </TouchableOpacity>

          <Text style={styles.secureText}>
            <Ionicons name="shield-checkmark" size={12} color="#666" /> Your
            payment information is secure
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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

/**
 * Usage Example (for future integration):
 * 
 * import CreditCardPayment from '@/components/CreditCardPayment';
 * 
 * const [showPaymentModal, setShowPaymentModal] = useState(false);
 * const depositAmount = 100;
 * 
 * const handlePaymentSubmit = (cardDetails) => {
 *   // Process payment with card details
 *   console.log('Card details:', cardDetails);
 *   addFunds(depositAmount);
 *   setShowPaymentModal(false);
 * };
 * 
 * <CreditCardPayment
 *   visible={showPaymentModal}
 *   onClose={() => setShowPaymentModal(false)}
 *   onPaymentSubmit={handlePaymentSubmit}
 *   depositAmount={depositAmount}
 * />
 */
