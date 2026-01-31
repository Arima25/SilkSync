import { View, Text, Button } from "react-native";
import { useRouter } from "expo-router";

export default function Home() {
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      }}
    >
      <Text style={{ fontSize: 28, marginBottom: 32 }}>
        Home
      </Text>

      <Button
        title="Log out"
        onPress={() => router.replace("/auth/signup")}
      />
    </View>
  );
}
