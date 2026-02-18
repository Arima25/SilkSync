import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/firebase';

export type SocialIntent = 
  | 'searching_friends'
  | 'searching_travel_buddy'
  | 'searching_food_partner'
  | 'solo_traveler'
  | 'open_to_connect'
  | 'custom';

export const SOCIAL_INTENT_LABELS: Record<SocialIntent, string> = {
  'searching_friends': 'Searching for friends',
  'searching_travel_buddy': 'Looking for a travel buddy',
  'searching_food_partner': 'Looking for someone to eat together',
  'solo_traveler': 'Enjoying solo adventures',
  'open_to_connect': 'Open to connect',
  'custom': 'Custom status',
};

export interface JourneyImage {
  id: string;
  uri: string;
  location?: string;
  timestamp: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  socialIntent: SocialIntent;
  customStatus: string;
  bio: string;
  journeyImages: JourneyImage[];
  totalStops: number;
}

interface UserContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateSocialIntent: (intent: SocialIntent, customText?: string) => Promise<void>;
  addJourneyImage: (image: JourneyImage) => Promise<void>;
  removeJourneyImage: (imageId: string) => Promise<void>;
  updateProfilePhoto: (uri: string) => Promise<void>;
}

const defaultProfile: UserProfile = {
  uid: '',
  displayName: 'Guest User',
  email: '',
  photoURL: null,
  socialIntent: 'open_to_connect',
  customStatus: '',
  bio: '',
  journeyImages: [],
  totalStops: 0,
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email || 'No user');
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Fetch or create user profile from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const existingProfile = userDoc.data() as UserProfile;
            console.log('Found existing profile:', existingProfile.displayName);
            setProfile(existingProfile);
          } else {
            // Create new profile for first-time users
            const newProfile: UserProfile = {
              ...defaultProfile,
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL,
            };
            console.log('Creating new profile for:', newProfile.displayName);
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error('Error fetching/creating user profile:', error);
          // Fallback: create a local profile from Firebase auth data
          const fallbackProfile: UserProfile = {
            ...defaultProfile,
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL,
          };
          setProfile(fallbackProfile);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, updates);
      setProfile((prev) => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating profile:', error);
      // Still update local state
      setProfile((prev) => prev ? { ...prev, ...updates } : null);
    }
  };

  const updateSocialIntent = async (intent: SocialIntent, customText?: string) => {
    const updates: Partial<UserProfile> = { socialIntent: intent };
    if (intent === 'custom' && customText) {
      updates.customStatus = customText;
    }
    await updateProfile(updates);
  };

  const addJourneyImage = async (image: JourneyImage) => {
    if (!profile) return;
    
    const updatedImages = [...profile.journeyImages, image];
    await updateProfile({ 
      journeyImages: updatedImages,
      totalStops: updatedImages.length 
    });
  };

  const removeJourneyImage = async (imageId: string) => {
    if (!profile) return;
    
    const updatedImages = profile.journeyImages.filter((img) => img.id !== imageId);
    await updateProfile({ 
      journeyImages: updatedImages,
      totalStops: updatedImages.length 
    });
  };

  const updateProfilePhoto = async (uri: string) => {
    await updateProfile({ photoURL: uri });
  };

  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        loading,
        updateProfile,
        updateSocialIntent,
        addJourneyImage,
        removeJourneyImage,
        updateProfilePhoto,
      }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
