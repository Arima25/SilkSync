// Currency Exchange Service
// Uses mock data for frontend development
import { ExchangeRate } from '../types';

const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest';
const CACHE_DURATION = 3600000; // 1 hour

// Simple in-memory storage
const storage: Map<string, string> = new Map();

class CurrencyService {
  private rates: Map<string, number> = new Map();
  private lastUpdated: Date | null = null;
  private useMockData: boolean = true;

  constructor() {
    this.useFallbackRates();
  }

  // Fetch exchange rates
  async fetchRates(baseCurrency: string = 'USD'): Promise<void> {
    try {
      const cached = await this.getCachedRates();
      if (cached) {
        this.rates = new Map(Object.entries(cached.rates));
        this.lastUpdated = new Date(cached.lastUpdated);
        return;
      }

      if (this.useMockData) {
        this.useFallbackRates();
        return;
      }

      const response = await fetch(`${EXCHANGE_API_URL}/${baseCurrency}`);
      const data = await response.json();
      this.rates = new Map(Object.entries(data.rates));
      this.lastUpdated = new Date();

      await this.cacheRates({
        rates: data.rates,
        lastUpdated: this.lastUpdated.toISOString(),
      });
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      this.useFallbackRates();
    }
  }

  // Convert currency
  convert(amount: number, from: string, to: string): number {
    if (from === to) return amount;

    const fromRate = this.rates.get(from) || 1;
    const toRate = this.rates.get(to) || 1;

    const usdAmount = amount / fromRate;
    return usdAmount * toRate;
  }

  // Convert CNY to USD
  cnyToUsd(amount: number): number {
    return this.convert(amount, 'CNY', 'USD');
  }

  // Convert USD to CNY
  usdToCny(amount: number): number {
    return this.convert(amount, 'USD', 'CNY');
  }

  // Get current exchange rate
  getRate(from: string, to: string): ExchangeRate {
    const fromRate = this.rates.get(from) || 1;
    const toRate = this.rates.get(to) || 1;
    const rate = toRate / fromRate;

    return {
      base: from,
      target: to,
      rate,
      lastUpdated: this.lastUpdated?.toISOString() || new Date().toISOString(),
    };
  }

  // Format currency for display
  formatCurrency(amount: number, currency: string): string {
    const symbols: Record<string, string> = {
      CNY: '¥',
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
    };

    const symbol = symbols[currency] || currency;
    return `${symbol}${amount.toFixed(2)}`;
  }

  // Cache rates to storage
  private async cacheRates(data: { rates: Record<string, number>; lastUpdated: string }): Promise<void> {
    try {
      storage.set('exchange_rates', JSON.stringify(data));
    } catch (error) {
      console.error('Error caching exchange rates:', error);
    }
  }

  // Get cached rates
  private async getCachedRates(): Promise<{ rates: Record<string, number>; lastUpdated: string } | null> {
    try {
      const cached = storage.get('exchange_rates');
      if (cached) {
        const data = JSON.parse(cached);
        const cachedTime = new Date(data.lastUpdated).getTime();
        if (Date.now() - cachedTime < CACHE_DURATION) {
          return data;
        }
      }
    } catch (error) {
      console.error('Error reading cached rates:', error);
    }
    return null;
  }

  // Fallback rates if API is unavailable
  private useFallbackRates(): void {
    this.rates = new Map([
      ['USD', 1],
      ['CNY', 7.25],
      ['EUR', 0.92],
      ['GBP', 0.79],
      ['JPY', 148.5],
      ['HKD', 7.82],
      ['KRW', 1320],
      ['SGD', 1.34],
    ]);
    this.lastUpdated = new Date();
  }

  setUseMockData(useMock: boolean): void {
    this.useMockData = useMock;
  }
}

export const currencyService = new CurrencyService();
