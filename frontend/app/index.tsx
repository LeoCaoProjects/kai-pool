import { Redirect } from "expo-router";
import { Text, View } from "react-native";

import { useAuth } from "../src/features/auth/AuthContext";

export default function Index() {
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

  return <Redirect href={user.onboardingCompleted ? "/(tabs)/home" : "/onboarding"} />;
}
