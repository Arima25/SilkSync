import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrainData } from './searchTypes';
import { sharedStyles } from './sharedStyles';

interface SearchResultsProps {
  searchResults: TrainData[];
  checkingIn: boolean;
  formatPriceDisplay: (priceCny: number | null) => { cny: string; usd: string };
  onBack: () => void;
  onViewDetails: (train: TrainData) => void;
  onCheckIn: (train: TrainData) => void;
}

export function SearchResults({
  searchResults,
  checkingIn,
  formatPriceDisplay,
  onBack,
  onViewDetails,
  onCheckIn,
}: SearchResultsProps) {
  return (
    <ScrollView style={sharedStyles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.resultsHeader}>
        <TouchableOpacity onPress={onBack} style={sharedStyles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.resultsTitle}>HSR Available Trains</Text>
        <View style={styles.resultsCount}>
          <Text style={styles.resultsCountText}>{searchResults.length} results found</Text>
        </View>
      </View>

      {searchResults.map((train, index) => {
        const displayPrice = formatPriceDisplay(train.price);
        return (
          <View key={`${train.id}-${train.departureTime}-${index}`} style={styles.trainCard}>
            <View style={styles.trainHeader}>
              <View style={styles.trainTypeBadge}>
                <Text style={styles.trainTypeText}>{train.type}</Text>
              </View>
              <Text style={styles.trainId}>{train.id}</Text>
              <View style={styles.trainPriceContainer}>
                <Text style={styles.trainPrice}>{displayPrice.cny}</Text>
                {displayPrice.usd ? <Text style={styles.trainPriceUsd}>{displayPrice.usd}</Text> : null}
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
              <TouchableOpacity style={styles.detailsButton} onPress={() => onViewDetails(train)}>
                <Text style={styles.detailsButtonText}>Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.joinTripButton}
                onPress={() => onCheckIn(train)}
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
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
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
  trainPriceUsd: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
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
});
