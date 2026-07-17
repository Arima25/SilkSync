import { logger } from '@/lib/logger';

const API_BASE_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

export interface CoTraveler {
  userId: string;
  userName: string;
  journeyId: string;
  trainNumber: string;
  departureDate: string;
  sameCoach: boolean;
}

/**
 * Every other user who has ever shared a checked-in journey (same train + date)
 * with userId -- a provable co-presence signal, not a self-reported claim.
 */
export const getCoTravelers = async (userId: string): Promise<CoTraveler[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/trust/co-travelers/${userId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch co-travelers');
    }

    const data = await response.json();
    return data.coTravelers || [];
  } catch (error) {
    logger.error('Get co-travelers error:', error);
    return [];
  }
};

/**
 * Number of distinct journeys userId has checked into -- a simple "Verified Traveler" score.
 */
export const getTrustScore = async (userId: string): Promise<number> => {
  try {
    const response = await fetch(`${API_BASE_URL}/trust/score/${userId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch trust score');
    }

    const data = await response.json();
    return Number(data.verifiedTripsCount) || 0;
  } catch (error) {
    logger.error('Get trust score error:', error);
    return 0;
  }
};
