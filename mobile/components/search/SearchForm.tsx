import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ValidationErrors } from './searchTypes';
import { formatDate } from './searchUtils';
import { sharedStyles } from './sharedStyles';

interface SearchFormProps {
  fromStation: string;
  toStation: string;
  errors: ValidationErrors;
  departureDate: Date;
  showDatePicker: boolean;
  isSearching: boolean;
  apiError: boolean;
  onChangeFrom: (text: string) => void;
  onChangeTo: (text: string) => void;
  onSwap: () => void;
  onOpenDatePicker: () => void;
  onDateChange: (event: any, selectedDate?: Date) => void;
  onSearch: () => void;
}

export function SearchForm({
  fromStation,
  toStation,
  errors,
  departureDate,
  showDatePicker,
  isSearching,
  apiError,
  onChangeFrom,
  onChangeTo,
  onSwap,
  onOpenDatePicker,
  onDateChange,
  onSearch,
}: SearchFormProps) {
  return (
    <ScrollView style={sharedStyles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Book Your Journey</Text>
      </View>

      <View style={styles.formSection}>
        {/* From Station */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Departure Station</Text>
          <View style={[styles.inputContainer, errors.from && styles.inputError]}>
            <Ionicons
              name="location"
              size={20}
              color={errors.from ? '#EF4444' : '#2DD4BF'}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter origin"
              placeholderTextColor="#9CA3AF"
              value={fromStation}
              onChangeText={onChangeFrom}
            />
            {errors.from && (
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
            )}
          </View>
          {errors.from && <Text style={styles.errorText}>{errors.from}</Text>}
        </View>

        {/* Swap Button */}
        <TouchableOpacity style={styles.swapButton} onPress={onSwap}>
          <Ionicons name="swap-vertical" size={20} color="#2DD4BF" />
        </TouchableOpacity>

        {/* To Station */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Arrival Station</Text>
          <View style={[styles.inputContainer, errors.to && styles.inputError]}>
            <Ionicons
              name="location-outline"
              size={20}
              color={errors.to ? '#EF4444' : '#10B981'}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter destination"
              placeholderTextColor="#9CA3AF"
              value={toStation}
              onChangeText={onChangeTo}
            />
            {errors.to && (
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
            )}
          </View>
          {errors.to && <Text style={styles.errorText}>{errors.to}</Text>}
        </View>

        {/* Date Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Travel Date</Text>
          <TouchableOpacity style={styles.inputContainer} onPress={onOpenDatePicker}>
            <Ionicons name="calendar-outline" size={20} color="#64748B" style={styles.inputIcon} />
            <Text style={styles.dateText}>{formatDate(departureDate)}</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={departureDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {/* Search Button */}
        <TouchableOpacity style={styles.searchButton} onPress={onSearch} disabled={isSearching}>
          {isSearching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="search" size={20} color="#fff" />
          )}
          <Text style={styles.searchButtonText}>{isSearching ? 'Searching...' : 'Search Trains'}</Text>
        </TouchableOpacity>
      </View>

      {/* API Error Banner */}
      {apiError && (
        <View style={styles.errorBanner}>
          <View style={styles.errorBannerContent}>
            <Ionicons name="wifi-outline" size={20} color="#EF4444" />
            <Text style={styles.errorBannerText}>API Connection Error</Text>
          </View>
          <TouchableOpacity onPress={onSearch}>
            <Text style={styles.retryText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  formSection: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  swapButton: {
    alignSelf: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -8,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2DD4BF',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#991B1B',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2DD4BF',
  },
});
