import { Redirect, Tabs, usePathname } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../src/features/auth/AuthContext";
import KaiTabBar from "../../src/ui/KaiTabBar";

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
      edges={isScanScreen ? [] : ["top"]}
      style={{
        backgroundColor: isScanScreen ? "#000000" : "#FDF9F0",
        flex: 1,
      }}
    >
      <Tabs
        tabBar={(props) => (isScanScreen ? null : <KaiTabBar {...props} />)}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="food-pool"
          options={{
            title: "Food Pool",
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: "Discover",
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: "Scan",
          }}
        />
        <Tabs.Screen
          name="connections"
          options={{
            title: "Connections",
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
