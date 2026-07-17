import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrainData } from './searchTypes';
import { sharedStyles } from './sharedStyles';
import { isWeChatBookingConfigured, openWeChatBooking } from '@/lib/wechat';

interface TrainDetailProps {
  selectedTrain: TrainData;
  checkingIn: boolean;
  formatPriceDisplay: (priceCny: number | null) => { cny: string; usd: string };
  onBack: () => void;
  onBookTicket: () => void;
  onCheckIn: (train: TrainData) => void;
}

export function TrainDetail({
  selectedTrain,
  checkingIn,
  formatPriceDisplay,
  onBack,
  onBookTicket,
  onCheckIn,
}: TrainDetailProps) {
  const detailPrice = formatPriceDisplay(selectedTrain.price);

  const handleWeChatBooking = async () => {
    const opened = await openWeChatBooking(`/pages/booking/index?trainCode=${selectedTrain.id}`);
    if (!opened) {
      onBookTicket();
    }
  };

  return (
    <ScrollView style={sharedStyles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={sharedStyles.backButton}>
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
          <TouchableOpacity style={styles.bookTicketButton} onPress={onBookTicket}>
            <Ionicons name="cart" size={20} color="#fff" />
            <Text style={styles.bookTicketButtonText}>Book Ticket</Text>
          </TouchableOpacity>

          {isWeChatBookingConfigured() && (
            <TouchableOpacity style={styles.weChatButton} onPress={handleWeChatBooking}>
              <Ionicons name="logo-wechat" size={20} color="#fff" />
              <Text style={styles.weChatButtonText}>Pay with WeChat</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.joinCommunityButtonFull}
          onPress={() => onCheckIn(selectedTrain)}
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
        <Text style={styles.ticketNote}>
          Book tickets on 12306 • Join fellow travelers in chat
        </Text>

        {/* Train Info */}
        <View style={styles.trainInfoRow}>
          <View style={styles.trainInfoItem}>
            <Ionicons name="pricetag-outline" size={24} color="#64748B" />
            <Text style={styles.trainInfoLabel}>Price</Text>
            <Text style={styles.trainInfoValue}>{detailPrice.cny}</Text>
            {detailPrice.usd ? <Text style={styles.trainInfoSubValue}>{detailPrice.usd}</Text> : null}
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
}

const styles = StyleSheet.create({
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
    marginBottom: 12,
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
  weChatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07C160',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  weChatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  joinCommunityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  joinCommunityButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2DD4BF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
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
  trainInfoSubValue: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});
