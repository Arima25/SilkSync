import { logger } from '@/lib/logger';

const API_BASE_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

export type ReportReason = 'harassment' | 'inappropriate' | 'spam' | 'safety' | 'other';

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: 'Harassment',
  inappropriate: 'Inappropriate content',
  spam: 'Spam',
  safety: 'Safety concern',
  other: 'Other',
};

/**
 * Block a user so their messages and traveler entries are hidden client-side.
 */
export const blockUser = async (userId: string, blockedUserId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, blockedUserId }),
    });

    if (!response.ok) {
      throw new Error('Failed to block user');
    }
  } catch (error) {
    logger.error('Block user error:', error);
    throw error;
  }
};

/**
 * Get the set of user ids the current user has blocked.
 */
export const getBlockedUserIds = async (userId: string): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/blocked/${userId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch blocked users');
    }

    const data = await response.json();
    return data.blockedUserIds || [];
  } catch (error) {
    logger.error('Get blocked users error:', error);
    return [];
  }
};

/**
 * File a report against another user, optionally scoped to a journey.
 */
export const reportUser = async (
  reporterUserId: string,
  reportedUserId: string,
  reason: ReportReason,
  message?: string,
  journeyId?: string
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reporterUserId,
        reportedUserId,
        reason,
        message: message || null,
        journeyId: journeyId || null,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit report');
    }
  } catch (error) {
    logger.error('Report user error:', error);
    throw error;
  }
};
