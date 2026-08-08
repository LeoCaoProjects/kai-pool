import { Redirect, Tabs } from "expo-router";
import { Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../src/features/auth/AuthContext";

export default function TabLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!user.onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  return <SafeAreaView edges={["top"]} style={{ backgroundColor: "#FDF9F0", flex: 1 }}>
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#173124", tabBarInactiveTintColor: "#616862", tabBarLabelStyle: { fontSize: 11, fontWeight: "600" }, tabBarStyle: { backgroundColor: "#FDF9F0", borderTopColor: "#C2C8C2", height: 68, paddingBottom: 8, paddingTop: 7 } }}>
      <Tabs.Screen name="food-pool" options={{ title: "Food Pool", tabBarIcon: ({ color, size }) => <Ionicons name="file-tray-stacked-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="discover" options={{ title: "Discover", tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="scan" options={{ title: "Scan", tabBarIcon: ({ color, size }) => <Ionicons name="scan-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="connections" options={{ title: "Connections", tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="home" options={{ href: null }} />
      <Tabs.Screen name="matches" options={{ href: null }} />
      <Tabs.Screen name="marketplace" options={{ href: null }} />
    </Tabs>
  </SafeAreaView>;
}
