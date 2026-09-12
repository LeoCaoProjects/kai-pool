import { Redirect, Tabs, usePathname } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../src/features/auth/AuthContext";
import KaiTabBar from "../../src/ui/KaiTabBar";
import { getFoods } from "../../src/api/foods";
import {
  getClaimedMarketplaceFoods,
  getMarketplaceFoods,
} from "../../src/api/marketplace";
import { getCookingMatches } from "../../src/api/matches";
import { getCookingConnections } from "../../src/api/connections";
import { loadScreenCache } from "../../src/api/screenCache";

export default function TabLayout() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const isScanScreen = pathname.endsWith("/scan");
  const isDiscoverScreen = pathname.endsWith("/discover");
  const isEdgeToEdgeScreen = isScanScreen || isDiscoverScreen;

  useEffect(() => {
    if (!user?.onboardingCompleted) return;
    // Warm every main tab after sign-in. Failures remain local to each screen.
    void Promise.allSettled([
      loadScreenCache("foods", getFoods),
      loadScreenCache("marketplaceAvailable", getMarketplaceFoods),
      loadScreenCache("marketplaceClaimed", getClaimedMarketplaceFoods),
      loadScreenCache("matches", getCookingMatches),
      loadScreenCache("connections", getCookingConnections),
    ]);
  }, [user?.id, user?.onboardingCompleted]);

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
      edges={isEdgeToEdgeScreen ? [] : ["top"]}
      style={{
        backgroundColor: isScanScreen ? "#000000" : "#FDF9F0",
        flex: 1,
      }}
    >
      <Tabs
        tabBar={(props) => (isScanScreen ? null : <KaiTabBar {...props} />)}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle:
            route.name === "discover"
              ? {
                  backgroundColor: "transparent",
                  borderTopWidth: 0,
                  elevation: 0,
                  position: "absolute",
                }
              : undefined,
        })}
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
