import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: "Sign In", headerBackVisible: false }}
      />
      <Stack.Screen
        name="signup"
        options={{ title: "Create Account" }}
      />
    </Stack>
  );
}
