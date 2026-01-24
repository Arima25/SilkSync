// Mock Authentication Service for Frontend Development
// Replace with Firebase Auth when ready for production
import { User, LoginFormData, RegisterFormData } from '../types';

// Mock user for development
let mockCurrentUser: User | null = null;
let authStateListeners: ((user: User | null) => void)[] = [];

class AuthService {
  // Get current user
  getCurrentUser(): User | null {
    return mockCurrentUser;
  }

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    authStateListeners.push(callback);
    // Call immediately with current state
    setTimeout(() => callback(mockCurrentUser), 0);
    
    // Return unsubscribe function
    return () => {
      authStateListeners = authStateListeners.filter(cb => cb !== callback);
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    authStateListeners.forEach(cb => cb(mockCurrentUser));
  }

  // Email/Password Sign Up
  async signUp(data: RegisterFormData): Promise<User> {
    await this.simulateDelay();

    if (!data.email || !data.password) {
      throw new Error('Email and password are required');
    }

    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const user: User = {
      id: `user_${Date.now()}`,
      email: data.email,
      displayName: data.displayName || null,
      photoURL: null,
      phoneNumber: null,
      createdAt: new Date(),
    };

    mockCurrentUser = user;
    this.notifyListeners();
    
    return user;
  }

  // Email/Password Sign In
  async signIn(data: LoginFormData): Promise<User> {
    await this.simulateDelay();

    if (!data.email || !data.password) {
      throw new Error('Email and password are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Invalid email address');
    }

    const user: User = {
      id: `user_${Date.now()}`,
      email: data.email,
      displayName: data.email.split('@')[0],
      photoURL: null,
      phoneNumber: null,
      createdAt: new Date(),
    };

    mockCurrentUser = user;
    this.notifyListeners();
    
    return user;
  }

  // Sign Out
  async signOut(): Promise<void> {
    await this.simulateDelay();
    mockCurrentUser = null;
    this.notifyListeners();
  }

  // Password Reset
  async resetPassword(email: string): Promise<void> {
    await this.simulateDelay();
    
    if (!email) {
      throw new Error('Email is required');
    }

    console.log(`Password reset email sent to: ${email}`);
  }

  // Phone Number Authentication (mock)
  async signInWithPhoneNumber(phoneNumber: string): Promise<{ confirm: (code: string) => Promise<User> }> {
    await this.simulateDelay();
    
    return {
      confirm: async (_code: string) => {
        await this.simulateDelay();
        
        const user: User = {
          id: `user_${Date.now()}`,
          email: '',
          displayName: 'Phone User',
          photoURL: null,
          phoneNumber: phoneNumber,
          createdAt: new Date(),
        };

        mockCurrentUser = user;
        this.notifyListeners();
        
        return user;
      }
    };
  }

  private simulateDelay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const authService = new AuthService();
