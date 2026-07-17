import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;

interface StationCardData {
  journeyId: string;
  trainNumber: string;
  departureStation: string;
  departureStationZh?: string;
  arrivalStation: string;
  arrivalStationZh?: string;
  departureDate: string;
  departureTime: string;
  cachedAt: string;
}

const cacheKey = (journeyId: string) => `station-card:${journeyId}`;

export default function StationCardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    journeyId?: string;
    trainNumber?: string;
    departureStation?: string;
    departureStationZh?: string;
    arrivalStation?: string;
    arrivalStationZh?: string;
    departureDate?: string;
    departureTime?: string;
  }>();

  const journeyId = params.journeyId || '';
  const trainNumber = params.trainNumber || '';

  const [card, setCard] = useState<StationCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadCard = async () => {
      const baseCard: StationCardData = {
        journeyId,
        trainNumber,
        departureStation: params.departureStation || '',
        departureStationZh: params.departureStationZh,
        arrivalStation: params.arrivalStation || '',
        arrivalStationZh: params.arrivalStationZh,
        departureDate: params.departureDate || '',
        departureTime: params.departureTime || '--:--',
        cachedAt: new Date().toISOString(),
      };

      try {
        const fromStation = params.departureStationZh || params.departureStation || '';
        const toStation = params.arrivalStationZh || params.arrivalStation || '';
        const url =
          `${BACKEND_BASE_URL}/api/trains/stops/${encodeURIComponent(trainNumber)}` +
          `?from_station=${encodeURIComponent(fromStation)}` +
          `&to_station=${encodeURIComponent(toStation)}` +
          `&train_date=${encodeURIComponent(params.departureDate || '')}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Stops request failed (${response.status})`);
        }

        const data = await response.json();
        const firstStop = data?.stations?.[0];

        const freshCard: StationCardData = {
          ...baseCard,
          departureTime: firstStop?.start_time || baseCard.departureTime,
        };

        await AsyncStorage.setItem(cacheKey(journeyId), JSON.stringify(freshCard));

        if (!cancelled) {
          setCard(freshCard);
          setIsOffline(false);
        }
      } catch (error) {
        logger.error('Station card: live fetch failed, falling back to cache:', error);

        try {
          const cached = await AsyncStorage.getItem(cacheKey(journeyId));
          if (!cancelled) {
            setCard(cached ? JSON.parse(cached) : baseCard);
            setIsOffline(true);
          }
        } catch {
          if (!cancelled) {
            setCard(baseCard);
            setIsOffline(true);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (journeyId) {
      loadCard();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [
    journeyId,
    trainNumber,
    params.departureStation,
    params.departureStationZh,
    params.arrivalStation,
    params.arrivalStationZh,
    params.departureDate,
    params.departureTime,
  ]);

  const qrValue = `${journeyId}|${trainNumber}|${card?.departureDate || ''}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Station Card</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2DD4BF" />
        </View>
      ) : !card ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No journey selected</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {isOffline && (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={16} color="#92400E" />
              <Text style={styles.offlineBannerText}>
                Showing your last saved copy -- no connection right now
              </Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.trainNumber}>{card.trainNumber}</Text>

            <View style={styles.routeRow}>
              <View style={styles.stationBlock}>
                <Text style={styles.stationZh}>{card.departureStationZh || card.departureStation}</Text>
                <Text style={styles.stationEn}>{card.departureStation}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#94A3B8" style={styles.routeArrow} />
              <View style={styles.stationBlock}>
                <Text style={styles.stationZh}>{card.arrivalStationZh || card.arrivalStation}</Text>
                <Text style={styles.stationEn}>{card.arrivalStation}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color="#64748B" />
              <Text style={styles.detailText}>{card.departureDate}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color="#64748B" />
              <Text style={styles.detailText}>Departs {card.departureTime}</Text>
            </View>

            <View style={styles.qrContainer}>
              <QRCode value={qrValue} size={160} />
            </View>
            <Text style={styles.qrHint}>
              Show this screen to station staff, or scan it to reopen this journey's chat
            </Text>
          </View>

          <Text style={styles.cachedNote}>
            Saved for offline use as of {new Date(card.cachedAt).toLocaleString()}
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSpacer: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
  },
  scrollContent: {
    padding: 20,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  trainNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  routeArrow: {
    marginHorizontal: 16,
  },
  stationBlock: {
    alignItems: 'center',
    flex: 1,
  },
  stationZh: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  stationEn: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '600',
  },
  qrContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
  },
  qrHint: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 12,
  },
  cachedNote: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
  },
});
