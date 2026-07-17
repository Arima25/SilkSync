import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from './searchUtils';

interface NoResultsProps {
  departureDate: Date;
  onBack: () => void;
  onTryDate: (daysOffset: number) => void;
}

export function NoResults({ departureDate, onBack, onTryDate }: NoResultsProps) {
  const nextDay = new Date(departureDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const dayAfter = new Date(departureDate);
  dayAfter.setDate(dayAfter.getDate() + 2);

  return (
    <View style={styles.noResultsContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButtonAbsolute}>
        <Ionicons name="arrow-back" size={24} color="#0F172A" />
      </TouchableOpacity>

      <View style={styles.noResultsContent}>
        <View style={styles.noResultsIcon}>
          <Ionicons name="train-outline" size={48} color="#2DD4BF" />
        </View>
        <Text style={styles.noResultsTitle}>No trains found for this date</Text>
        <Text style={styles.noResultsSubtitle}>
          We could not find any scheduled services for {formatDate(departureDate)}.
          Try searching for a different day or checking nearby stations.
        </Text>

        <View style={styles.alternateDatesRow}>
          <TouchableOpacity style={styles.alternateDateButton} onPress={() => onTryDate(1)}>
            <Text style={styles.alternateDateText}>Try {formatDate(nextDay).split(',')[0]}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.alternateDateButton} onPress={() => onTryDate(2)}>
            <Text style={styles.alternateDateText}>Try {formatDate(dayAfter).split(',')[0]}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.viewScheduleButton} onPress={onBack}>
          <Text style={styles.viewScheduleText}>View Schedule</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  noResultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  backButtonAbsolute: {
    padding: 4,
    marginTop: 16,
  },
  noResultsContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  noResultsIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  alternateDatesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  alternateDateButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2DD4BF',
  },
  alternateDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2DD4BF',
  },
  viewScheduleButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewScheduleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
});
