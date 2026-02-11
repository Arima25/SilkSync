import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Share,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useItinerary } from '@/src/context/ItineraryContext';

type CurrencyView = 'USD' | 'CNY' | 'side-by-side';

export default function CostScreen() {
  const { itinerary } = useItinerary();
  const [currencyView, setCurrencyView] = useState<CurrencyView>('side-by-side');

  const handleBack = () => {
    router.back();
  };

  const handleShare = async () => {
    try {
      const shareMessage = `🌏 My Trip Budget - ${itinerary.origin} to ${itinerary.destination}

💰 Total Budget: $${itinerary.totalBudgetUSD.toLocaleString()} USD (≈¥${itinerary.totalBudgetCNY.toLocaleString()} CNY)

📊 Spending Breakdown:
${itinerary.categories.map(cat => `• ${cat.name}: $${cat.amountUSD.toLocaleString()}`).join('\n')}

Total Spent: $${itinerary.totalSpentUSD.toLocaleString()}

Shared via SilkSync ✨`;

      await Share.share({
        message: shareMessage,
        title: 'My SilkSync Trip Budget',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share itinerary');
    }
  };

  const formatAmount = (usd: number, cny: number) => {
    switch (currencyView) {
      case 'USD':
        return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'CNY':
        return `¥${cny.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'side-by-side':
      default:
        return {
          usd: `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          cny: `¥${cny.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        };
    }
  };

  // Calculate percentages for donut chart
  const totalSpent = itinerary.categories.reduce((sum, cat) => sum + cat.amountUSD, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cost Breakdown</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroImageContainer}>
          <View style={styles.heroImagePlaceholder}>
            <Ionicons name="image" size={60} color="#87CEEB" />
            <Text style={styles.heroPlaceholderText}>Travel Destination</Text>
          </View>
        </View>

        {/* Budget Overview Card */}
        <View style={styles.budgetCard}>
          <Text style={styles.budgetLabel}>BUDGET OVERVIEW</Text>
          <View style={styles.budgetHeader}>
            <View>
              <Text style={styles.budgetTitle}>Total Trip Budget</Text>
              <Text style={styles.budgetAmountUSD}>
                ${itinerary.totalBudgetUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
              </Text>
              <Text style={styles.budgetAmountCNY}>
                ≈ ¥{itinerary.totalBudgetCNY.toLocaleString('en-US', { minimumFractionDigits: 2 })} CNY
              </Text>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit Budget</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Currency Toggle */}
        <View style={styles.currencyToggle}>
          <TouchableOpacity
            style={[styles.currencyButton, currencyView === 'USD' && styles.currencyButtonActive]}
            onPress={() => setCurrencyView('USD')}
          >
            <Text style={[styles.currencyButtonText, currencyView === 'USD' && styles.currencyButtonTextActive]}>
              USD
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.currencyButton, currencyView === 'CNY' && styles.currencyButtonActive]}
            onPress={() => setCurrencyView('CNY')}
          >
            <Text style={[styles.currencyButtonText, currencyView === 'CNY' && styles.currencyButtonTextActive]}>
              CNY
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.currencyButton, currencyView === 'side-by-side' && styles.currencyButtonActive]}
            onPress={() => setCurrencyView('side-by-side')}
          >
            <Text style={[styles.currencyButtonText, currencyView === 'side-by-side' && styles.currencyButtonTextActive]}>
              Side-by-Side
            </Text>
          </TouchableOpacity>
        </View>

        {/* Spending by Category */}
        <View style={styles.spendingCard}>
          <View style={styles.spendingHeader}>
            <View>
              <Text style={styles.spendingLabel}>SPENDING BY CATEGORY</Text>
              <Text style={styles.spendingAmount}>
                ${itinerary.totalSpentUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <View style={styles.changeRow}>
                <Ionicons name="trending-up" size={14} color="#2eb296" />
                <Text style={styles.changeText}>+{itinerary.percentChange}% vs last trip</Text>
              </View>
            </View>
            {/* Donut Chart Placeholder */}
            <View style={styles.donutChart}>
              {itinerary.categories.map((cat, index) => (
                <View
                  key={cat.id}
                  style={[
                    styles.donutSegment,
                    {
                      backgroundColor: cat.color,
                      transform: [{ rotate: `${index * 90}deg` }],
                    },
                  ]}
                />
              ))}
              <View style={styles.donutCenter} />
            </View>
          </View>

          {/* Category Legend */}
          <View style={styles.categoryLegend}>
            {itinerary.categories.map((cat) => (
              <View key={cat.id} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                <Text style={styles.legendText}>{cat.name.split(' ')[0].toUpperCase().slice(0, 5)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Category Details */}
        <Text style={styles.detailsTitle}>Category Details</Text>
        <View style={styles.categoryList}>
          {itinerary.categories.map((category) => (
            <View key={category.id} style={styles.categoryItem}>
              <View style={styles.categoryLeft}>
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <Ionicons name={category.icon as any} size={20} color={category.color} />
                </View>
                <View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryDesc}>{category.description}</Text>
                </View>
              </View>
              <View style={styles.categoryRight}>
                {currencyView === 'side-by-side' ? (
                  <>
                    <Text style={styles.categoryAmountUSD}>
                      ${category.amountUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                    <Text style={styles.categoryAmountCNY}>
                      ¥{category.amountCNY.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.categoryAmountUSD}>
                    {formatAmount(category.amountUSD, category.amountCNY) as string}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  heroImageContainer: {
    height: 160,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroImagePlaceholder: {
    flex: 1,
    backgroundColor: '#87CEEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  budgetCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  budgetLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  budgetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  budgetAmountUSD: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  budgetAmountCNY: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  editButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  currencyToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  currencyButtonActive: {
    backgroundColor: '#F0F0F0',
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  currencyButtonTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  spendingCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  spendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spendingLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  spendingAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 13,
    color: '#2eb296',
    fontWeight: '500',
  },
  donutChart: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
    position: 'relative',
    overflow: 'hidden',
  },
  donutSegment: {
    position: 'absolute',
    width: 40,
    height: 40,
    top: 0,
    left: 20,
    transformOrigin: 'bottom center',
  },
  donutCenter: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    top: 15,
    left: 15,
  },
  categoryLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  legendItem: {
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  categoryList: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  categoryDesc: {
    fontSize: 12,
    color: '#999',
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryAmountUSD: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  categoryAmountCNY: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  spacer: {
    height: 40,
  },
});
