import { Alert, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../auth/AuthContext";
import ProfileForm from "./ProfileForm";
import { colors, sharedStyles } from "../../ui/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  const signOut = async () => {
    await logout();
    router.replace("/login");
  };

  const confirmSignOut = () => Alert.alert("Log out?", "You can log back in at any time.", [
    { text: "Cancel", style: "cancel" },
    { text: "Log out", style: "destructive", onPress: () => void signOut() },
  ]);

  return (
    <ScrollView style={sharedStyles.screen} contentContainerStyle={styles.content}>
      <ProfileForm title="Profile" submitLabel="Save profile" />
      <Pressable onPress={confirmSignOut} style={styles.logout}><Text style={styles.logoutText}>Log out</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { gap: 24, padding: 20, paddingBottom: 48 }, logout: { alignItems: "center", borderColor: colors.error, borderRadius: 12, borderWidth: 1, justifyContent: "center", minHeight: 52 }, logoutText: { color: colors.error, fontSize: 15, fontWeight: "600" } });
