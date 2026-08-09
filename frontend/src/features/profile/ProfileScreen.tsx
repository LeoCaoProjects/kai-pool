import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import PageHeader from "../../ui/PageHeader";
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

  const confirmSignOut = () =>
    Alert.alert("Log out?", "You can log back in at any time.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => void signOut() },
    ]);

  return (
    <View style={sharedStyles.screen}>
      <PageHeader
        eyebrow="YOUR ACCOUNT"
        icon="person-circle"
        title="Profile"
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formContent}>
          <ProfileForm
            showHeading={false}
            submitLabel="Save profile"
            title="Profile"
          />
          <Pressable onPress={confirmSignOut} style={styles.logout}>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 24, paddingBottom: 48 },
  formContent: { gap: 24, paddingHorizontal: 20 },
  logout: {
    alignItems: "center",
    borderColor: colors.error,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: "600" },
});
