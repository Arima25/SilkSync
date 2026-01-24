// Type definitions for SilkSync

// User & Authentication
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// Travel Data
export interface City {
  id: number;
  name: string;
  nameZh: string;
  latitude: number;
  longitude: number;
  country: string;
}

export interface HSRRoute {
  id: number;
  trainNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  price: number;
  priceUSD: number;
  availableSeats: number;
}

export interface FlightRoute {
  id: number;
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  price: number;
  priceUSD: number;
  availableSeats: number;
}

export interface RoutesResponse {
  hsr: HSRRoute[];
  flights: FlightRoute[];
}

// Traveler & Matching
export interface Traveler {
  id: number;
  userId: string;
  name: string;
  origin: string;
  destination: string;
  budget: number;
  budgetCurrency: 'CNY' | 'USD';
  travelDate: string;
  createdAt: string;
}

export interface TravelerMatch {
  id: number;
  name: string;
  origin: string;
  destination: string;
  travelDate: string;
  budget: number;
  matchScore: number;
}

export interface MatchesResponse {
  routeMatches: TravelerMatch[];
  destinationMatches: TravelerMatch[];
}

// Itinerary
export interface Itinerary {
  id: number;
  travelerId: number;
  routeId: number;
  routeType: 'hsr' | 'flight';
  status: 'planned' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

// Currency Exchange
export interface ExchangeRate {
  base: string;
  target: string;
  rate: number;
  lastUpdated: string;
}

// Map
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapMarker {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description?: string;
  type: 'origin' | 'destination' | 'station' | 'airport';
}

// Navigation
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Search: undefined;
  RouteDetails: { routeId: number; routeType: 'hsr' | 'flight' };
  Map: { origin?: City; destination?: City };
  Matches: { travelerId: number };
  Profile: undefined;
  Settings: undefined;
};

export type BottomTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  MapTab: undefined;
  MatchesTab: undefined;
  ProfileTab: undefined;
};

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form Data
export interface SearchFormData {
  origin: string;
  destination: string;
  travelDate: Date;
  budget: number;
  budgetCurrency: 'CNY' | 'USD';
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}
