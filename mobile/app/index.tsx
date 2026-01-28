import { View, Platform } from "react-native";
import { WebView } from "react-native-webview";

export default function Index() {
  const url =
    Platform.OS === "ios"
      ? "http://192.168.192.212:5001"
      : "http://10.0.2.2:5001";

  return (
    <View style={{ flex: 1 }}>
      <WebView source={{ uri: url }} />
    </View>
  );
}
