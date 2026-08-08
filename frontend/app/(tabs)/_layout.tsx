import { Redirect, Tabs, usePathname } from "expo-router";
import { Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../src/features/auth/AuthContext";

export default function TabLayout() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const isScanScreen = pathname.endsWith("/scan");

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

  return (
    <SafeAreaView
      edges={isScanScreen ? [] : ["top", "bottom"]}
      style={{
        backgroundColor: isScanScreen ? "#000000" : "#FDF9F0",
        flex: 1,
      }}
    >
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#173124",
          tabBarInactiveTintColor: "#616862",
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
          tabBarStyle: isScanScreen
            ? { display: "none" }
            : {
                backgroundColor: "#FDF9F0",
                borderTopColor: "#C2C8C2",
                height: 72,
                paddingBottom: 10,
                paddingTop: 8,
              },
        }}
      >
        <Tabs.Screen
          name="food-pool"
          options={{
            title: "Food Pool",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="file-tray-stacked-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: "Discover",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="compass-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: "Scan",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="scan-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="connections"
          options={{
            title: "Connections",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
