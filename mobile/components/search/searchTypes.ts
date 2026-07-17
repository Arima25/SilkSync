export type SearchState = 'initial' | 'results' | 'no-results' | 'detail';

export interface TrainData {
  id: string;
  type: string;
  departureStation: string;
  departureStationZh?: string;
  arrivalStation: string;
  arrivalStationZh?: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number | null;
  class: string;
  stops: {
    station: string;
    platform: string;
    time: string;
    type: string;
  }[];
  coach: string;
}

export interface ValidationErrors {
  from?: string;
  to?: string;
  date?: string;
}

export interface StationLabel {
  en?: string;
  zh?: string;
}

export interface RouteTrainApi {
  train_code?: string;
  departure?: string;
  arrival?: string;
  duration?: string;
  from_station?: StationLabel;
  to_station?: StationLabel;
  seats?: {
    class_en?: string;
    availability?: string;
  }[];
}

export interface RouteResponseApi {
  trains?: RouteTrainApi[];
}

export interface StopsResponseApi {
  stations?: {
    station_name?: string;
    start_time?: string;
    arrive_time?: string;
    stopover_time?: string;
  }[];
}

export interface PriceRowApi {
  train_code?: string;
  start_time?: string;
  prices?: Record<string, string>;
}

export interface PriceResponseApi {
  data?: PriceRowApi[];
}
// The backend response shape is not identical to our UI card shape.
// These types document backend payloads so we can map them safely into TrainData.
