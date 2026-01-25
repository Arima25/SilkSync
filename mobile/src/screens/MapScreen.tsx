// Map Screen with Mapbox (International) and Amap (China) support
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import MapboxGL from '@rnmapbox/maps';
import { mapService } from '@/services';
import { RootStackParamList, MapRegion, City } from '@/types';

// Initialize Mapbox
MapboxGL.setAccessToken(process.env.MAPBOX_ACCESS_TOKEN || '');

type MapScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Map'>;
  route: RouteProp<RootStackParamList, 'Map'>;
};

const MapScreen: React.FC<MapScreenProps> = ({ navigation, route }) => {
  const { origin, destination } = route.params || {};
  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  
  const [mapProvider, setMapProvider] = useState<'mapbox' | 'amap'>('mapbox');
  const [region, setRegion] = useState<MapRegion>(mapService.getChinaRegion());

  useEffect(() => {
    if (origin && destination) {
      const newRegion = mapService.getRouteRegion(origin, destination);
      setRegion(newRegion);
      
      // Determine map provider based on location
      const provider = mapService.getMapProvider(origin.latitude, origin.longitude);
      setMapProvider(provider);
    }
  }, [origin, destination]);

  const renderMarkers = () => {
    if (!origin && !destination) return null;

    const markers = [];

    if (origin) {
      markers.push(
        <MapboxGL.PointAnnotation
          key="origin"
          id="origin"
          coordinate={[origin.longitude, origin.latitude]}
        >
          <View style={styles.markerOrigin}>
            <Text style={styles.markerText}>🚩</Text>
          </View>
          <MapboxGL.Callout title={origin.name} />
        </MapboxGL.PointAnnotation>
      );
    }

    if (destination) {
      markers.push(
        <MapboxGL.PointAnnotation
          key="destination"
          id="destination"
          coordinate={[destination.longitude, destination.latitude]}
        >
          <View style={styles.markerDestination}>
            <Text style={styles.markerText}>📍</Text>
          </View>
          <MapboxGL.Callout title={destination.name} />
        </MapboxGL.PointAnnotation>
      );
    }

    return markers;
  };

  const renderRouteLine = () => {
    if (!origin || !destination) return null;

    const routeCoordinates = [
      [origin.longitude, origin.latitude],
      [destination.longitude, destination.latitude],
    ];

    return (
      <MapboxGL.ShapeSource
        id="routeLine"
        shape={{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates,
          },
        }}
      >
        <MapboxGL.LineLayer
          id="routeLineLayer"
          style={{
            lineColor: '#c9a227',
            lineWidth: 3,
            lineDasharray: [2, 2],
          }}
        />
      </MapboxGL.ShapeSource>
    );
  };

  return (
    <View style={styles.container}>
      {/* Map Provider Toggle */}
      <View style={styles.providerToggle}>
        <TouchableOpacity
          style={[
            styles.providerButton,
            mapProvider === 'mapbox' && styles.providerButtonActive,
          ]}
          onPress={() => setMapProvider('mapbox')}
        >
          <Text
            style={[
              styles.providerText,
              mapProvider === 'mapbox' && styles.providerTextActive,
            ]}
          >
            Mapbox
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.providerButton,
            mapProvider === 'amap' && styles.providerButtonActive,
          ]}
          onPress={() => setMapProvider('amap')}
        >
          <Text
            style={[
              styles.providerText,
              mapProvider === 'amap' && styles.providerTextActive,
            ]}
          >
            高德 (Amap)
          </Text>
        </TouchableOpacity>
      </View>

      {mapProvider === 'mapbox' ? (
        <MapboxGL.MapView
          ref={mapRef}
          style={styles.map}
          styleURL={MapboxGL.StyleURL.Dark}
          logoEnabled={false}
          compassEnabled
          rotateEnabled
        >
          <MapboxGL.Camera
            ref={cameraRef}
            zoomLevel={4}
            centerCoordinate={[region.longitude, region.latitude]}
            animationMode="flyTo"
            animationDuration={1000}
          />
          {renderMarkers()}
          {renderRouteLine()}
        </MapboxGL.MapView>
      ) : (
        // Placeholder for Amap - would need react-native-amap3d integration
        <View style={styles.amapPlaceholder}>
          <Text style={styles.amapText}>高德地图</Text>
          <Text style={styles.amapSubtext}>Amap integration for China</Text>
          <Text style={styles.amapNote}>
            Better accuracy for Chinese cities and addresses
          </Text>
        </View>
      )}

      {/* Route Info Panel */}
      {origin && destination && (
        <View style={styles.infoPanel}>
          <View style={styles.routeInfo}>
            <View style={styles.cityInfo}>
              <Text style={styles.cityEmoji}>🚩</Text>
              <Text style={styles.cityName}>{origin.name}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
            <View style={styles.cityInfo}>
              <Text style={styles.cityEmoji}>📍</Text>
              <Text style={styles.cityName}>{destination.name}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => navigation.navigate('Search')}
          >
            <Text style={styles.searchButtonText}>Find Routes</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab}>
          <Text style={styles.fabIcon}>📍</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fab}>
          <Text style={styles.fabIcon}>🧭</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  map: {
    flex: 1,
  },
  providerToggle: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: '#2a2a4a',
    borderRadius: 10,
    padding: 4,
    zIndex: 100,
  },
  providerButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  providerButtonActive: {
    backgroundColor: '#c9a227',
  },
  providerText: {
    color: '#888',
    fontWeight: '600',
  },
  providerTextActive: {
    color: '#1a1a2e',
  },
  markerOrigin: {
    backgroundColor: '#2a2a4a',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  markerDestination: {
    backgroundColor: '#2a2a4a',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#c9a227',
  },
  markerText: {
    fontSize: 20,
  },
  amapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a4a',
  },
  amapText: {
    fontSize: 32,
    color: '#c9a227',
    fontWeight: 'bold',
  },
  amapSubtext: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 10,
  },
  amapNote: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#2a2a4a',
    borderRadius: 15,
    padding: 20,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  cityInfo: {
    alignItems: 'center',
  },
  cityEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  cityName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  arrow: {
    color: '#c9a227',
    fontSize: 24,
    marginHorizontal: 20,
  },
  searchButton: {
    backgroundColor: '#c9a227',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 180,
  },
  fab: {
    backgroundColor: '#2a2a4a',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabIcon: {
    fontSize: 24,
  },
});

export default MapScreen;
