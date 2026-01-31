import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Auth */}
      <Stack.Screen name="auth/signup" />

      {/* Main app */}
      <Stack.Screen name="home" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
