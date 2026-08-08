import { Stack } from "expo-router";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { AuthProvider } from "../src/features/auth/AuthContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

const detailOptions = {
  headerShown: true,
  headerTintColor: "#173124",
  headerStyle: { backgroundColor: "#FDF9F0" },
  headerShadowVisible: false,
};

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#FDF9F0" />
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#FDF9F0" },
          }}
        >
          <Stack.Screen
            name="match/[matchedUserId]"
            options={{
              ...detailOptions,
              title: "Cooking match",
              headerBackTitle: "Discover",
            }}
          />
          <Stack.Screen
            name="marketplace/[listingId]"
            options={{
              ...detailOptions,
              title: "Giveaway details",
              headerBackTitle: "Discover",
            }}
          />
          <Stack.Screen
            name="connection/[connectionId]"
            options={{
              ...detailOptions,
              title: "Cooking connection",
              headerBackTitle: "Connections",
            }}
          />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
