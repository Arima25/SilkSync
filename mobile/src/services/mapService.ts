// Map Service - Handles Mapbox (International) and Amap (China)
import { Platform } from 'react-native';
import { MapRegion, MapMarker, City } from '@/types';

// China bounding box
const CHINA_BOUNDS = {
  minLat: 18.0,
  maxLat: 53.5,
  minLng: 73.5,
  maxLng: 135.0,
};

class MapService {
  // Determine if location is in China
  isInChina(latitude: number, longitude: number): boolean {
    return (
      latitude >= CHINA_BOUNDS.minLat &&
      latitude <= CHINA_BOUNDS.maxLat &&
      longitude >= CHINA_BOUNDS.minLng &&
      longitude <= CHINA_BOUNDS.maxLng
    );
  }

  // Get which map provider to use based on location
  getMapProvider(latitude: number, longitude: number): 'amap' | 'mapbox' {
    return this.isInChina(latitude, longitude) ? 'amap' : 'mapbox';
  }

  // Get initial region for China
  getChinaRegion(): MapRegion {
    return {
      latitude: 35.8617,
      longitude: 104.1954,
      latitudeDelta: 30,
      longitudeDelta: 30,
    };
  }

  // Get initial region for a specific city
  getCityRegion(city: City): MapRegion {
    return {
      latitude: city.latitude,
      longitude: city.longitude,
      latitudeDelta: 0.5,
      longitudeDelta: 0.5,
    };
  }

  // Calculate region to fit both origin and destination
  getRouteRegion(origin: City, destination: City): MapRegion {
    const minLat = Math.min(origin.latitude, destination.latitude);
    const maxLat = Math.max(origin.latitude, destination.latitude);
    const minLng = Math.min(origin.longitude, destination.longitude);
    const maxLng = Math.max(origin.longitude, destination.longitude);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDelta = (maxLat - minLat) * 1.5;
    const lngDelta = (maxLng - minLng) * 1.5;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(latDelta, 0.5),
      longitudeDelta: Math.max(lngDelta, 0.5),
    };
  }

  // Create markers for origin and destination
  createRouteMarkers(origin: City, destination: City): MapMarker[] {
    return [
      {
        id: `origin_${origin.id}`,
        coordinate: {
          latitude: origin.latitude,
          longitude: origin.longitude,
        },
        title: origin.name,
        description: 'Starting point',
        type: 'origin',
      },
      {
        id: `destination_${destination.id}`,
        coordinate: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
        title: destination.name,
        description: 'Destination',
        type: 'destination',
      },
    ];
  }

  // Convert GCJ-02 (Chinese coordinate system) to WGS-84
  // Used when displaying Amap data on Mapbox
  gcj02ToWgs84(lat: number, lng: number): { latitude: number; longitude: number } {
    const PI = Math.PI;
    const a = 6378245.0;
    const ee = 0.00669342162296594323;

    if (!this.isInChina(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }

    let dLat = this.transformLat(lng - 105.0, lat - 35.0);
    let dLng = this.transformLng(lng - 105.0, lat - 35.0);

    const radLat = (lat / 180.0) * PI;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);

    dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * PI);
    dLng = (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * PI);

    return {
      latitude: lat - dLat,
      longitude: lng - dLng,
    };
  }

  // Convert WGS-84 to GCJ-02 (for displaying on Amap)
  wgs84ToGcj02(lat: number, lng: number): { latitude: number; longitude: number } {
    const PI = Math.PI;
    const a = 6378245.0;
    const ee = 0.00669342162296594323;

    if (!this.isInChina(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }

    let dLat = this.transformLat(lng - 105.0, lat - 35.0);
    let dLng = this.transformLng(lng - 105.0, lat - 35.0);

    const radLat = (lat / 180.0) * PI;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);

    dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * PI);
    dLng = (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * PI);

    return {
      latitude: lat + dLat,
      longitude: lng + dLng,
    };
  }

  private transformLat(x: number, y: number): number {
    const PI = Math.PI;
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0;
    ret += ((160.0 * Math.sin((y / 12.0) * PI) + 320 * Math.sin((y * PI) / 30.0)) * 2.0) / 3.0;
    return ret;
  }

  private transformLng(x: number, y: number): number {
    const PI = Math.PI;
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0;
    ret += ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0;
    return ret;
  }
}

export const mapService = new MapService();
