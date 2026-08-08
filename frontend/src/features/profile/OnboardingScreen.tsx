import { Redirect, useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";

import { useAuth } from "../auth/AuthContext";
import ProfileForm from "./ProfileForm";
import { sharedStyles } from "../../ui/theme";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }
  if (!user) {
    return <Redirect href="/login" />;
  }
  if (user.onboardingCompleted) {
    return <Redirect href="/(tabs)/food-pool" />;
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={sharedStyles.screen}>
      <ScrollView
        style={sharedStyles.screen}
        contentContainerStyle={styles.content}
      >
        <ProfileForm
          title="Set up your profile"
          submitLabel="Finish setup"
          completeOnboarding
          onSaved={() => router.replace("/(tabs)/food-pool")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 48 },
});
