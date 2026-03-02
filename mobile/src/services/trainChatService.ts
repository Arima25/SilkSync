import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { SocialIntent } from '../context/UserContext';

// Use 10.0.2.2 for Android emulator to access host machine's localhost
const API_BASE_URL = 'http://10.0.2.2:5001/api';

export interface CheckInData {
  userId: string;
  userName: string;
  userPhoto?: string | null;
  trainNumber: string;
  departureDate: string;
  departureStation: string;
  arrivalStation: string;
  socialIntent: SocialIntent;
}

export interface CheckInResponse {
  success: boolean;
  journeyId: string;
  message: string;
}

export interface Traveler {
  userId: string;
  userName: string;
  userPhoto?: string | null;
  socialIntent: SocialIntent;
  checkedInAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string | null;
  message: string;
  timestamp: Timestamp;
  journeyId: string;
  messageType?: 'text' | 'coordination' | 'system';
  coordinationType?: 'pickup' | 'meal' | 'dining-car' | 'general';
}

/**
 * Check in a user to a specific train journey
 */
export const checkInToJourney = async (checkInData: CheckInData): Promise<CheckInResponse> => {
  try {
    // Add timeout to prevent infinite loading
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${API_BASE_URL}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkInData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Failed to check in');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Check-in error:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - please check your connection');
    }
    throw error;
  }
};

/**
 * Get list of travelers on a specific train journey
 */
export const getTrainTravelers = async (journeyId: string): Promise<Traveler[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/train-travelers/${journeyId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch travelers');
    }

    const data = await response.json();
    return data.travelers || [];
  } catch (error) {
    console.error('Error fetching travelers:', error);
    return [];
  }
};

/**
 * Send a message to the train chat room
 */
export const sendChatMessage = async (
  journeyId: string,
  userId: string,
  userName: string,
  userPhoto: string | null | undefined,
  message: string,
  messageType: 'text' | 'coordination' | 'system' = 'text',
  coordinationType?: 'pickup' | 'meal' | 'dining-car' | 'general'
): Promise<void> => {
  try {
    const chatRef = collection(db, 'trainChats', journeyId, 'messages');
    
    await addDoc(chatRef, {
      userId,
      userName,
      userPhoto: userPhoto || null,
      message,
      timestamp: serverTimestamp(),
      journeyId,
      messageType,
      coordinationType: coordinationType || null,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time chat messages for a train journey
 */
export const subscribeToChatMessages = (
  journeyId: string,
  callback: (messages: ChatMessage[]) => void
): (() => void) => {
  const chatRef = collection(db, 'trainChats', journeyId, 'messages');
  const q = query(chatRef, orderBy('timestamp', 'asc'));

  const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const messages: ChatMessage[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ChatMessage[];

    callback(messages);
  });

  return unsubscribe;
};

/**
 * Send a coordination request (e.g., for pickup sharing)
 */
export const sendCoordinationMessage = async (
  journeyId: string,
  userId: string,
  userName: string,
  userPhoto: string | null | undefined,
  coordinationType: 'pickup' | 'meal' | 'dining-car' | 'general',
  message: string
): Promise<void> => {
  return sendChatMessage(
    journeyId,
    userId,
    userName,
    userPhoto,
    message,
    'coordination',
    coordinationType
  );
};

/**
 * Get SOCIAL_INTENT_LABELS for display
 */
export const SOCIAL_INTENT_LABELS: Record<SocialIntent, string> = {
  'searching_friends': 'Searching for friends',
  'searching_travel_buddy': 'Travel Buddy',
  'searching_food_partner': 'Meal Buddy',
  'solo_traveler': 'Solo Traveler',
  'open_to_connect': 'Open to Chat',
  'custom': 'Custom',
};

/**
 * Get SOCIAL_INTENT_BADGES for UI display
 */
export const getSocialIntentBadge = (intent: SocialIntent): { label: string; color: string; icon: string } => {
  const badges = {
    'searching_friends': { label: 'Looking for Friends', color: '#8B5CF6', icon: 'people' },
    'searching_travel_buddy': { label: 'Travel Buddy', color: '#06B6D4', icon: 'airplane' },
    'searching_food_partner': { label: 'Meal Buddy', color: '#F59E0B', icon: 'restaurant' },
    'solo_traveler': { label: 'Solo Traveler', color: '#64748B', icon: 'person' },
    'open_to_connect': { label: 'Open to Chat', color: '#10B981', icon: 'chatbubbles' },
    'custom': { label: 'Custom', color: '#6B7280', icon: 'star' },
  };

  return badges[intent] || badges['open_to_connect'];
};
