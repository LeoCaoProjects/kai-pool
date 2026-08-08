import { Redirect } from "expo-router";
import { Text, View } from "react-native";

import { useAuth } from "../src/features/auth/AuthContext";
import WelcomeScreen from "../src/features/auth/WelcomeScreen";
import { colors } from "../src/ui/theme";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.background,
          flex: 1,
          justifyContent: "center",
          padding: 16,
        }}
      >
        <Text
          style={{ color: colors.primary, fontSize: 16, fontWeight: "600" }}
        >
          Loading Kai Pool…
        </Text>
      </View>
    );
  }

  if (!user) return <WelcomeScreen />;

  return (
    <Redirect
      href={user.onboardingCompleted ? "/(tabs)/food-pool" : "/onboarding"}
    />
  );
}
