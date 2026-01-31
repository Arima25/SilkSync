import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";

import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

export default function Signup() {
  const router = useRouter();

  const { iosClientId, webClientId } =
    Constants.expoConfig?.extra?.googleOAuth ?? {};

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId,
    webClientId,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const accessToken = response.authentication?.accessToken;
      if (!accessToken) return;

      sendTokenToBackend(accessToken);
    }
  }, [response]);

  const sendTokenToBackend = async (accessToken: string) => {
    try {
      const res = await fetch("http://127.0.0.1:5001/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessToken }),
      });

      if (!res.ok) {
        throw new Error("Backend authentication failed");
      }

      const user = await res.json();
      console.log("Logged in user:", user);

      router.replace("/home");
    } catch (err) {
      console.error(err);
    }
  };

  if (!request) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

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
        Sign up
      </Text>

      <Pressable
        onPress={() => promptAsync()}
        style={{
          backgroundColor: "#4285F4",
          paddingVertical: 14,
          paddingHorizontal: 24,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "white", fontSize: 16 }}>
          Continue with Google
        </Text>
      </Pressable>
    </View>
  );
}
