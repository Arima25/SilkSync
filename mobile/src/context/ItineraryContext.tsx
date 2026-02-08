import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface CategorySpending {
  id: string;
  name: string;
  description: string;
  amountUSD: number;
  amountCNY: number;
  color: string;
  icon: string;
}

export interface ItineraryData {
  origin: string;
  destination: string;
  transportMode: string;
  soloPrice: number;
  togetherPrice: number;
  savings: number;
  sharedLodging: boolean;
  totalBudgetUSD: number;
  totalBudgetCNY: number;
  totalSpentUSD: number;
  percentChange: number;
  categories: CategorySpending[];
}

interface ItineraryContextType {
  itinerary: ItineraryData;
  setItinerary: (data: ItineraryData) => void;
  updateBudget: (usd: number, cny: number) => void;
}

// Default placeholder data - will be replaced by algorithm results
const defaultItinerary: ItineraryData = {
  origin: 'Shanghai',
  destination: 'Hangzhou',
  transportMode: 'HSR',
  soloPrice: 45.0,
  togetherPrice: 32.0,
  savings: 13.0,
  sharedLodging: true,
  totalBudgetUSD: 5000.0,
  totalBudgetCNY: 36120.0,
  totalSpentUSD: 3240.5,
  percentChange: 12,
  categories: [
    {
      id: 'transport',
      name: 'Transport',
      description: 'Flights, Uber, Metro',
      amountUSD: 1250.0,
      amountCNY: 9030.0,
      color: '#3B82F6',
      icon: 'car-outline',
    },
    {
      id: 'food',
      name: 'Food & Dining',
      description: 'Restaurants, Street food',
      amountUSD: 840.5,
      amountCNY: 6072.0,
      color: '#F59E0B',
      icon: 'restaurant-outline',
    },
    {
      id: 'lodging',
      name: 'Lodging',
      description: 'Hotels, Airbnbs',
      amountUSD: 1550.0,
      amountCNY: 11200.0,
      color: '#8B5CF6',
      icon: 'bed-outline',
    },
    {
      id: 'activities',
      name: 'Activities',
      description: 'Museums, Tours, Events',
      amountUSD: 600.0,
      amountCNY: 4335.0,
      color: '#EF4444',
      icon: 'ticket-outline',
    },
  ],
};

const ItineraryContext = createContext<ItineraryContextType | undefined>(undefined);

export function ItineraryProvider({ children }: { children: ReactNode }) {
  const [itinerary, setItinerary] = useState<ItineraryData>(defaultItinerary);

  const updateBudget = (usd: number, cny: number) => {
    setItinerary((prev) => ({
      ...prev,
      totalBudgetUSD: usd,
      totalBudgetCNY: cny,
    }));
  };

  return (
    <ItineraryContext.Provider value={{ itinerary, setItinerary, updateBudget }}>
      {children}
    </ItineraryContext.Provider>
  );
}

export function useItinerary() {
  const context = useContext(ItineraryContext);
  if (context === undefined) {
    throw new Error('useItinerary must be used within an ItineraryProvider');
  }
  return context;
}
