import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, View, StyleSheet } from "react-native";
import Mapbox from "@rnmapbox/maps";
import * as Location from "expo-location";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { point, polygon } from "@turf/helpers";
import { AMapSdk, MapView as AMapView } from "react-native-amap3d";
import * as eviltransform from "eviltransform/transform";

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN || "");
AMapSdk.init(
  Platform.select({
    android: process.env.EXPO_PUBLIC_AMAP_ANDROID_API_KEY || "",
    ios: process.env.EXPO_PUBLIC_AMAP_IOS_API_KEY || "",
  })
);

const CHINA_BOUNDARY = polygon([
  [
    [73.66, 3.86],
    [135.05, 3.86],
    [135.05, 53.55],
    [73.66, 53.55],
    [73.66, 3.86],
  ],
]);

export default function Index() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  
  const mapboxCameraRef = useRef<Mapbox.Camera>(null);
  const amapRef = useRef<any>(null);

  //track the previous state to detect Border Crossings
  const lastCountryState = useRef<boolean | null>(null);
  const hasInitialFix = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let currentPosition: Location.LocationSubscription | null = null;

    const requestLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!isMounted) return;

      const granted = status === "granted";
      setHasPermission(granted);

      if (!granted) return;

      currentPosition = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (current) => {
          if (!isMounted) return;
          setLocation(current);
        }
      );
    };

    requestLocation();

    return () => {
      isMounted = false;
      if (currentPosition) {
        currentPosition.remove();
      }
    };
  }, []);

  const isInChina = useMemo(() => {
    if (!location) return false;
    const currentPoint = point([
      location.coords.longitude,
      location.coords.latitude,
    ]);
    return booleanPointInPolygon(currentPoint, CHINA_BOUNDARY);
  }, [location]);

  const amapCameraPosition = useMemo(() => {
    if (!location) {
      return {
        target: { latitude: 39.9042, longitude: 116.4074 },
        zoom: 17,
      };
    }
    
    const gcj = eviltransform.wgs2gcj(
      location.coords.latitude,
      location.coords.longitude
    );
    const gcjLat = Array.isArray(gcj) ? gcj[0] : gcj.lat;
    const gcjLng = Array.isArray(gcj) ? gcj[1] : gcj.lng;

    return {
      target: { latitude: gcjLat, longitude: gcjLng },
      zoom: 17,
    };
  }, [location]);

  const mapboxCenter = useMemo<[number, number] | undefined>(() => {
    if (!location) return undefined;
    return [location.coords.longitude, location.coords.latitude];
  }, [location]);

  useEffect(() => {
    if (!location) return;

    // We only move the camera if:
    // 1. It is the VERY FIRST load (so you don't start at 0,0)
    // 2. OR You just crossed the border (isInChina changed)
    const isFirstLoad = !hasInitialFix.current;
    const isBorderCrossing = lastCountryState.current !== isInChina;

    if (isFirstLoad || isBorderCrossing) {
      if (isInChina) {
        // enter China
        const gcj = eviltransform.wgs2gcj(
          location.coords.latitude,
          location.coords.longitude
        );
        const gcjLat = Array.isArray(gcj) ? gcj[0] : gcj.lat;
        const gcjLng = Array.isArray(gcj) ? gcj[1] : gcj.lng;

        amapRef.current?.moveCamera({
          target: { latitude: gcjLat, longitude: gcjLng },
          zoom: 17,
          duration: 1000,
        });
      } else {
        // exit China
        mapboxCameraRef.current?.setCamera({
          centerCoordinate: [location.coords.longitude, location.coords.latitude],
          zoomLevel: 15,
          animationDuration: 1000,
        });
      }

      // Mark that we handled this state
      lastCountryState.current = isInChina;
      hasInitialFix.current = true;
    }
  }, [location, isInChina]);

  return (
    <View style={styles.page}>
      <AMapView
        ref={amapRef}
        style={[styles.map, { zIndex: isInChina ? 2 : 0, opacity: isInChina ? 1 : 0 }]}
        pointerEvents={isInChina ? "auto" : "none"}
        myLocationEnabled={hasPermission === true}
        initialCameraPosition={amapCameraPosition}
      />

      <Mapbox.MapView
        style={[styles.map, { zIndex: !isInChina ? 2 : 0, opacity: !isInChina ? 1 : 0 }]}
        pointerEvents={!isInChina ? "auto" : "none"}
      >
        <Mapbox.Camera
          ref={mapboxCameraRef}
          followUserLocation={false}
          zoomLevel={15}
          centerCoordinate={mapboxCenter}
        />
        <Mapbox.UserLocation visible={hasPermission === true} />
      </Mapbox.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});