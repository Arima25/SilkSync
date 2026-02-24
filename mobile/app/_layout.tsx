import { Stack } from "expo-router";
import { WalletProvider } from "@/src/context/WalletContext";
import { ItineraryProvider } from "@/src/context/ItineraryContext";

export default function RootLayout() {
  return (
    <ItineraryProvider>
      <WalletProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Main app */}
          <Stack.Screen name="home" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </WalletProvider>
    </ItineraryProvider>
  );
}
