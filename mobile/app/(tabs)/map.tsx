import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import Mapbox from "@rnmapbox/maps";
import * as Location from "expo-location";

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN || "");

export default function Index() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    let isMounted = true;

    const requestLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!isMounted) {
        return;
      }

      const granted = status === "granted";
      setHasPermission(granted);

      if (!granted) {
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (!isMounted) {
        return;
      }

      setLocation(current);
    };

    requestLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  const centerCoordinate = location
    ? [location.coords.longitude, location.coords.latitude]
    : undefined;

  return (
    <View style={styles.page}>
      <Mapbox.MapView style={styles.map}>
        <Mapbox.Camera
          centerCoordinate={centerCoordinate}
          zoomLevel={centerCoordinate ? 14 : 1}
          animationMode="flyTo"
          animationDuration={1000}
        />
        <Mapbox.UserLocation visible={hasPermission === true} />
      </Mapbox.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});
