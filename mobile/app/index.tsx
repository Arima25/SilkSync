import { View, StyleSheet } from "react-native";
import Mapbox from "@rnmapbox/maps";

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN || "");

export default function Index() {
  return (
    <View style={styles.page}>
      <Mapbox.MapView style={styles.map} />
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
