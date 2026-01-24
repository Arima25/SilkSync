// API Service for Backend Communication
// Uses mock data for frontend development
import {
  City,
  RoutesResponse,
  MatchesResponse,
  Traveler,
  Itinerary,
  SearchFormData,
  HSRRoute,
  FlightRoute,
  TravelerMatch,
} from '../types';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

// Mock data for frontend development
const mockCities: City[] = [
  { id: 1, name: 'Beijing', nameZh: '北京', latitude: 39.9042, longitude: 116.4074, country: 'China' },
  { id: 2, name: 'Shanghai', nameZh: '上海', latitude: 31.2304, longitude: 121.4737, country: 'China' },
  { id: 3, name: 'Guangzhou', nameZh: '广州', latitude: 23.1291, longitude: 113.2644, country: 'China' },
  { id: 4, name: 'Shenzhen', nameZh: '深圳', latitude: 22.5431, longitude: 114.0579, country: 'China' },
  { id: 5, name: 'Hangzhou', nameZh: '杭州', latitude: 30.2741, longitude: 120.1551, country: 'China' },
  { id: 6, name: "Xi'an", nameZh: '西安', latitude: 34.3416, longitude: 108.9398, country: 'China' },
  { id: 7, name: 'Chengdu', nameZh: '成都', latitude: 30.5728, longitude: 104.0668, country: 'China' },
  { id: 8, name: 'Hong Kong', nameZh: '香港', latitude: 22.3193, longitude: 114.1694, country: 'China' },
  { id: 9, name: 'Nanjing', nameZh: '南京', latitude: 32.0603, longitude: 118.7969, country: 'China' },
  { id: 10, name: 'Wuhan', nameZh: '武汉', latitude: 30.5928, longitude: 114.3055, country: 'China' },
];

// Simple in-memory storage
const storage: Map<string, string> = new Map();

class ApiService {
  private useMockData: boolean = true;

  // Cities
  async getCities(): Promise<City[]> {
    if (this.useMockData) {
      await this.simulateDelay();
      return mockCities;
    }

    const response = await fetch(`${API_BASE_URL}/cities`);
    return response.json();
  }

  // Routes
  async searchRoutes(searchData: SearchFormData): Promise<RoutesResponse> {
    if (this.useMockData) {
      await this.simulateDelay(800);
      return this.generateMockRoutes(searchData);
    }

    const response = await fetch(`${API_BASE_URL}/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: searchData.origin,
        destination: searchData.destination,
        travel_date: searchData.travelDate.toISOString(),
        budget: searchData.budget,
        budget_currency: searchData.budgetCurrency,
      }),
    });
    return response.json();
  }

  private generateMockRoutes(searchData: SearchFormData): RoutesResponse {
    const hsrRoutes: HSRRoute[] = [
      {
        id: 1,
        trainNumber: 'G1234',
        origin: searchData.origin,
        destination: searchData.destination,
        departureTime: '08:00',
        arrivalTime: '12:30',
        duration: 270,
        price: 553,
        priceUSD: 76,
        availableSeats: 42,
      },
      {
        id: 2,
        trainNumber: 'G5678',
        origin: searchData.origin,
        destination: searchData.destination,
        departureTime: '10:30',
        arrivalTime: '15:00',
        duration: 270,
        price: 553,
        priceUSD: 76,
        availableSeats: 128,
      },
      {
        id: 3,
        trainNumber: 'D2468',
        origin: searchData.origin,
        destination: searchData.destination,
        departureTime: '14:00',
        arrivalTime: '19:30',
        duration: 330,
        price: 445,
        priceUSD: 61,
        availableSeats: 85,
      },
    ];

    const flights: FlightRoute[] = [
      {
        id: 101,
        flightNumber: 'CA1234',
        airline: 'Air China',
        origin: searchData.origin,
        destination: searchData.destination,
        departureTime: '07:30',
        arrivalTime: '09:45',
        duration: 135,
        price: 890,
        priceUSD: 123,
        availableSeats: 24,
      },
      {
        id: 102,
        flightNumber: 'MU5678',
        airline: 'China Eastern',
        origin: searchData.origin,
        destination: searchData.destination,
        departureTime: '12:00',
        arrivalTime: '14:15',
        duration: 135,
        price: 750,
        priceUSD: 103,
        availableSeats: 56,
      },
    ];

    const budget = searchData.budgetCurrency === 'USD' 
      ? searchData.budget * 7.25 
      : searchData.budget;

    return {
      hsr: hsrRoutes.filter(r => r.price <= budget),
      flights: flights.filter(r => r.price <= budget),
    };
  }

  // Traveler
  async createTraveler(data: {
    name: string;
    origin: string;
    destination: string;
    budget: number;
    travelDate: string;
  }): Promise<Traveler> {
    if (this.useMockData) {
      await this.simulateDelay();
      return {
        id: Date.now(),
        userId: 'mock_user',
        name: data.name,
        origin: data.origin,
        destination: data.destination,
        budget: data.budget,
        budgetCurrency: 'CNY',
        travelDate: data.travelDate,
        createdAt: new Date().toISOString(),
      };
    }

    const response = await fetch(`${API_BASE_URL}/traveler`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  // Matches
  async findMatches(searchData: SearchFormData): Promise<MatchesResponse> {
    if (this.useMockData) {
      await this.simulateDelay(600);
      return this.generateMockMatches(searchData);
    }

    const response = await fetch(`${API_BASE_URL}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: searchData.origin,
        destination: searchData.destination,
        travel_date: searchData.travelDate.toISOString(),
        budget: searchData.budget,
      }),
    });
    return response.json();
  }

  private generateMockMatches(searchData: SearchFormData): MatchesResponse {
    const routeMatches: TravelerMatch[] = [
      {
        id: 1,
        name: 'Li Wei',
        origin: searchData.origin,
        destination: searchData.destination,
        travelDate: searchData.travelDate.toISOString(),
        budget: 800,
        matchScore: 95,
      },
      {
        id: 2,
        name: 'Sarah Chen',
        origin: searchData.origin,
        destination: searchData.destination,
        travelDate: searchData.travelDate.toISOString(),
        budget: 1200,
        matchScore: 88,
      },
    ];

    const destinationMatches: TravelerMatch[] = [
      {
        id: 3,
        name: 'Zhang Ming',
        origin: 'Hangzhou',
        destination: searchData.destination,
        travelDate: searchData.travelDate.toISOString(),
        budget: 600,
        matchScore: 72,
      },
    ];

    return { routeMatches, destinationMatches };
  }

  // Itinerary
  async createItinerary(travelerId: number, routeId: number): Promise<Itinerary> {
    if (this.useMockData) {
      await this.simulateDelay();
      return {
        id: Date.now(),
        travelerId,
        routeId,
        routeType: 'hsr',
        status: 'planned',
        createdAt: new Date().toISOString(),
      };
    }

    const response = await fetch(`${API_BASE_URL}/itinerary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        traveler_id: travelerId,
        route_id: routeId,
      }),
    });
    return response.json();
  }

  async getItineraries(): Promise<Itinerary[]> {
    if (this.useMockData) {
      await this.simulateDelay();
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/itineraries`);
    return response.json();
  }

  // Cache helpers using in-memory storage
  async cacheData(key: string, data: unknown): Promise<void> {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
      };
      storage.set(`cache_${key}`, JSON.stringify(cacheEntry));
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  async getCachedData<T>(key: string, maxAge: number = 3600000): Promise<T | null> {
    try {
      const cached = storage.get(`cache_${key}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < maxAge) {
          return data as T;
        }
      }
    } catch (error) {
      console.error('Error reading cache:', error);
    }
    return null;
  }

  private simulateDelay(ms: number = 300): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  setUseMockData(useMock: boolean): void {
    this.useMockData = useMock;
  }
}

export const apiService = new ApiService();
