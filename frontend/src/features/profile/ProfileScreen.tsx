import { Button, ScrollView } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../auth/AuthContext";
import ProfileForm from "./ProfileForm";

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  const signOut = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <ScrollView contentContainerStyle={{ gap: 12, padding: 16 }}>
      <ProfileForm title="Profile" submitLabel="Save profile" />
      <Button title="Log out" onPress={signOut} />
    </ScrollView>
  );
}
