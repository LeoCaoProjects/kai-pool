import { Stack } from "expo-router";

import { AuthProvider } from "../src/features/auth/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="match/[matchedUserId]"
          options={{
            headerShown: true,
            title: "Cooking match",
            headerBackTitle: "Matches",
            headerTintColor: "#28764a",
            headerStyle: { backgroundColor: "#f3f1e9" },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="marketplace/[listingId]"
          options={{
            headerShown: true,
            title: "Giveaway details",
            headerBackTitle: "Marketplace",
            headerTintColor: "#28764a",
            headerStyle: { backgroundColor: "#f3f1e9" },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="connection/[connectionId]"
          options={{
            headerShown: true,
            title: "Cooking connection",
            headerBackTitle: "Matches",
            headerTintColor: "#28764a",
            headerStyle: { backgroundColor: "#f3f1e9" },
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
