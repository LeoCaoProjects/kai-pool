import { Redirect, useRouter } from "expo-router";
import { ScrollView } from "react-native";

import { useAuth } from "../auth/AuthContext";
import ProfileForm from "./ProfileForm";

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
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <ScrollView contentContainerStyle={{ gap: 12, padding: 16 }}>
      <ProfileForm
        title="Set up your profile"
        submitLabel="Finish setup"
        completeOnboarding
        onSaved={() => router.replace("/(tabs)/home")}
      />
    </ScrollView>
  );
}
