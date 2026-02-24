import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWallet } from '@/src/context/WalletContext';

const QUICK_AMOUNTS = [50, 100, 500];

export default function WalletScreen() {
  const router = useRouter();
  const { balance, addFunds, transactions } = useWallet();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(100);
  const [customAmount, setCustomAmount] = useState('');

  // Show only last 3 transactions for preview
  const recentTransactions = transactions.slice(0, 3);

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
      addFunds(amount);
      Alert.alert(
        'Deposit Successful',
        `$${amount.toFixed(2)} has been added to your wallet.`,
        [{ text: 'OK' }]
      );
      setCustomAmount('');
      setSelectedAmount(100);
    } else {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to deposit.');
    }
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
            <TouchableOpacity onPress={() => router.push('/wallet/transactions' as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.map((transaction) => (
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
              <Text style={[
                styles.transactionAmount,
                transaction.amount > 0 ? styles.amountPositive : styles.amountNegative
              ]}>
                {transaction.amount > 0 ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

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
  amountPositive: {
    color: '#10B981',
  },
  amountNegative: {
    color: '#1a1a1a',
  },
  bottomSpacer: {
    height: 40,
  },
});
