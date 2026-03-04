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
import { useWallet } from '@/src/context/WalletContext';
import { useItinerary } from '@/src/context/ItineraryContext';

export default function ItinerariesScreen() {
  const { balance } = useWallet();
  const { itinerary } = useItinerary();
  const [isSaved, setIsSaved] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleBookNow = () => {
    // TODO: Implement booking logic
    console.log('Booking route...');
  };

  const handleSkip = () => {
    router.back();
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
  };

  const handleShare = async () => {
    try {
      const shareMessage = `🚄 Route Recommendation from SilkSync

${itinerary.origin} to ${itinerary.destination} via ${itinerary.transportMode}

💰 Solo Price: $${itinerary.soloPrice}
👥 Together Price: $${itinerary.togetherPrice} (Save $${itinerary.savings}!)

${itinerary.sharedLodging ? '🏨 Shared Lodging Interest Available!' : ''}

Book your trip with SilkSync ✨`;

      await Share.share({
        message: shareMessage,
        title: 'SilkSync Route Recommendation',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share itinerary');
    }
  };

  const handleRoutePress = () => {
    router.push('/cost' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SilkSync</Text>
        <TouchableOpacity style={styles.headerButton}>
          <View style={styles.profileIcon}>
            <Ionicons name="person" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Title Section */}
        <Text style={styles.pageTitle}>Budget-Based Route{"\n"}Suggestions</Text>

        {/* Available Funds */}
        <Text style={styles.fundsLabel}>TOTAL AVAILABLE FUNDS</Text>
        <View style={styles.fundsCard}>
          <Ionicons name="card-outline" size={20} color="#666" />
          <Text style={styles.fundsAmount}>
            ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyText}>USD</Text>
          </View>
        </View>

        {/* Route Card - Tappable to navigate to cost details */}
        <TouchableOpacity activeOpacity={0.9} onPress={handleRoutePress}>
          {/* Map Section */}
          <View style={styles.mapContainer}>
            {itinerary.sharedLodging && (
              <View style={styles.sharedBadge}>
                <Text style={styles.sharedBadgeText}>SHARED LODGING INTEREST</Text>
              </View>
            )}
            {/* Placeholder for map - replace with actual MapView */}
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map" size={80} color="#ccc" />
              <Text style={styles.mapPlaceholderText}>
                {itinerary.origin} → {itinerary.destination}
              </Text>
            </View>
          </View>

          {/* Route Recommendation */}
          <View style={styles.routeSection}>
            <Text style={styles.routeLabel}>ROUTE RECOMMENDATION</Text>
            <View style={styles.routeHeader}>
              <Text style={styles.routeTitle}>
                {itinerary.origin} to {itinerary.destination} via{"\n"}{itinerary.transportMode}
              </Text>
              <View style={styles.qrButton}>
                <Ionicons name="qr-code" size={20} color="#2eb296" />
              </View>
            </View>

            {/* Pricing */}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Estimated Total Price</Text>
              <Text style={styles.priceAmount}>${itinerary.soloPrice.toFixed(2)}</Text>
            </View>

            {/* Together Savings */}
            <View style={styles.savingsCard}>
              <Ionicons name="people" size={16} color="#2eb296" />
              <View>
                <Text style={styles.savingsTitle}>Together Price: ${itinerary.togetherPrice}</Text>
                <Text style={styles.savingsSubtitle}>
                  Save ${itinerary.savings} vs Solo (${itinerary.soloPrice})
                </Text>
              </View>
            </View>

            {/* Book Now Button */}
            <View style={styles.bookRow}>
              <TouchableOpacity style={styles.bookButton} onPress={handleBookNow}>
                <Text style={styles.bookButtonText}>Book Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreButton}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleSkip}>
          <Ionicons name="close" size={24} color="#666" />
          <Text style={styles.actionText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
          <Ionicons
            name={isSaved ? 'heart' : 'heart-outline'}
            size={24}
            color={isSaved ? '#ff6b6b' : '#666'}
          />
          <Text style={styles.actionText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="#2eb296" />
          <Text style={[styles.actionText, { color: '#2eb296' }]}>Share</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 24,
    lineHeight: 36,
  },
  fundsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  fundsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  fundsAmount: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 12,
  },
  currencyBadge: {
    backgroundColor: '#2eb296',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  mapContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  sharedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#2eb296',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 10,
  },
  sharedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#E8F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  routeSection: {
    marginBottom: 20,
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 28,
    flex: 1,
  },
  qrButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E8F8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  savingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
  },
  savingsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2eb296',
  },
  savingsSubtitle: {
    fontSize: 12,
    color: '#2eb296',
    marginTop: 2,
  },
  bookRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bookButton: {
    flex: 1,
    backgroundColor: '#2eb296',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  moreButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    height: 20,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    gap: 48,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
  },
});
