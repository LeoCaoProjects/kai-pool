import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "../../api/client";
import { changePassword } from "../../api/users";
import { colors, sharedStyles } from "../../ui/theme";
import { useAuth } from "../auth/AuthContext";

export default function ProfileScreen() {
  const router = useRouter();
  const { logout, updateUser, user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [finding, setFinding] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setName(user?.name ?? "");
    setBio(user?.bio ?? "");
  }, [user?.bio, user?.name]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3600);
    return () => clearTimeout(timer);
  }, [message]);

  const save = async () => {
    if (!user || !name.trim()) {
      setMessage("Enter your name before saving.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await updateUser({
        name: name.trim(),
        bio: bio.trim() || null,
        profileImageUrl: user.profileImageUrl,
        latitude: user.latitude,
        longitude: user.longitude,
        foodCultures: user.foodCultures,
        foodCulturesToExplore: user.foodCulturesToExplore,
        onboardingCompleted: user.onboardingCompleted,
      });
      setMessage("Profile saved");
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const locate = async () => {
    if (!user) return;
    setFinding(true);
    setMessage("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setMessage("Location permission is needed to find people and food nearby.");
        return;
      }
      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await updateUser({
        name: name.trim() || user.name,
        bio: bio.trim() || null,
        profileImageUrl: user.profileImageUrl,
        latitude: Number(result.coords.latitude.toFixed(2)),
        longitude: Number(result.coords.longitude.toFixed(2)),
        foodCultures: user.foodCultures,
        foodCulturesToExplore: user.foodCulturesToExplore,
        onboardingCompleted: user.onboardingCompleted,
      });
      setMessage("Approximate location updated");
    } catch {
      setMessage("Could not update your location. Try again.");
    } finally {
      setFinding(false);
    }
  };

  const signOut = () => Alert.alert("Log out?", "You can sign back in at any time.", [
    { text: "Cancel", style: "cancel" },
    { text: "Log out", style: "destructive", onPress: async () => {
      await logout();
      router.replace("/login");
    } },
  ]);

  return (
    <View style={sharedStyles.screen}>
      <View style={styles.profileHeader}>
        <View style={styles.profileMark}>
          <Text style={styles.profileInitial}>{(user?.name ?? "K").charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.profileHeading}>
          <Text style={styles.profileEyebrow}>PROFILE</Text>
          <Text numberOfLines={1} style={styles.profileName}>{user?.name ?? "Your account"}</Text>
          <Text numberOfLines={1} style={styles.profileEmail}>{user?.email}</Text>
        </View>
        <View style={styles.editMark}><Ionicons color={colors.primary} name="pencil" size={17} /></View>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ABOUT YOU</Text>
          <View style={styles.card}>
            <ProfileField icon="person-outline" label="Name">
              <TextInput
                autoCapitalize="words"
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#858A85"
                style={styles.input}
                value={name}
              />
            </ProfileField>
            <ProfileField icon="chatbubble-outline" label="About" optional>
              <TextInput
                maxLength={180}
                multiline
                onChangeText={setBio}
                placeholder="A little about you"
                placeholderTextColor="#858A85"
                style={[styles.input, styles.bio]}
                textAlignVertical="top"
                value={bio}
              />
            </ProfileField>
          </View>
          <Pressable disabled={saving} onPress={() => void save()} style={styles.primaryButton}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Save changes</Text>}
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PRIVACY & ACCESS</Text>
          <View style={styles.menuCard}>
            <MenuRow
              detail={user?.latitude != null ? "Location enabled" : "Not enabled"}
              icon="location-outline"
              loading={finding}
              onPress={() => void locate()}
              title="Approximate location"
            />
            <MenuRow
              detail="Update your sign-in password"
              icon="lock-closed-outline"
              onPress={() => setPasswordOpen(true)}
              title="Password & security"
            />
          </View>
        </View>

        <Pressable onPress={signOut} style={styles.logout}>
          <View style={styles.logoutIcon}><Ionicons color={colors.error} name="log-out-outline" size={20} /></View>
          <View style={styles.logoutCopy}><Text style={styles.logoutText}>Log out</Text><Text style={styles.logoutDetail}>Sign out of this device</Text></View>
          <Ionicons color={colors.error} name="chevron-forward" size={19} />
        </Pressable>
      </ScrollView>
      <PasswordSheet open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      {message ? <View pointerEvents="none" style={styles.toast}><Ionicons color="#FFFFFF" name="information-circle" size={19} /><Text style={styles.toastText}>{message}</Text></View> : null}
    </View>
  );
}

function ProfileField({ children, icon, label, optional }: {
  children: React.ReactNode;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  optional?: boolean;
}) {
  return <View style={styles.field}>
    <View style={styles.fieldHeading}>
      <View style={styles.fieldLabelRow}>
        <Ionicons color={colors.secondary} name={icon} size={17} />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      {optional ? <Text style={styles.optional}>Optional</Text> : null}
    </View>
    {children}
  </View>;
}

function MenuRow({ detail, icon, loading = false, onPress, title }: {
  detail: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  loading?: boolean;
  onPress: () => void;
  title: string;
}) {
  return <Pressable disabled={loading} onPress={onPress} style={styles.menuRow}>
    <View style={styles.menuIcon}><Ionicons color={colors.primary} name={icon} size={20} /></View>
    <View style={styles.menuCopy}>
      <Text style={styles.menuTitle}>{title}</Text>
      <Text style={styles.menuDetail}>{detail}</Text>
    </View>
    {loading ? <ActivityIndicator color={colors.primary} size="small" /> :
      <Ionicons color={colors.outline} name="chevron-forward" size={19} />}
  </Pressable>;
}

function PasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const translateY = useRef(new Animated.Value(420)).current;
  useEffect(() => {
    if (!open) return;
    translateY.setValue(420);
    Animated.spring(translateY, { damping: 24, stiffness: 240, toValue: 0, useNativeDriver: true }).start();
  }, [open, translateY]);
  const close = () => { setCurrentPassword(""); setNewPassword(""); setError(""); onClose(); };
  const submit = async () => {
    if (!currentPassword || newPassword.length < 8) {
      setError("Enter your current password and a new password with at least 8 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await changePassword({ currentPassword, newPassword });
      close();
      Alert.alert("Password updated", "Use your new password the next time you sign in.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update your password.");
    } finally { setBusy(false); }
  };
  return <Modal animationType="none" onRequestClose={close} transparent visible={open}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalFrame}>
      <Pressable onPress={close} style={styles.backdrop} />
      <Animated.View style={[styles.passwordSheetFrame, { transform: [{ translateY }] }]}>
      <SafeAreaView edges={["bottom"]} style={styles.passwordSheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeading}>
          <View><Text style={styles.sheetTitle}>Change password</Text><Text style={styles.sheetSubtitle}>Keep your Kai Pool account secure.</Text></View>
          <Pressable hitSlop={10} onPress={close}><Ionicons color={colors.text} name="close" size={23} /></Pressable>
        </View>
        <TextInput
          autoComplete="current-password" onChangeText={setCurrentPassword}
          placeholder="Current password" placeholderTextColor="#858A85" secureTextEntry
          style={styles.passwordInput} textContentType="password" value={currentPassword}
        />
        <TextInput
          autoComplete="new-password" onChangeText={setNewPassword}
          passwordRules="minlength: 8;" placeholder="New password"
          placeholderTextColor="#858A85" secureTextEntry style={styles.passwordInput}
          textContentType="newPassword" value={newPassword}
        />
        {error ? <Text style={styles.passwordError}>{error}</Text> : null}
        <Pressable disabled={busy} onPress={() => void submit()} style={styles.primaryButton}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Update password</Text>}
        </Pressable>
      </SafeAreaView>
      </Animated.View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: "center", backgroundColor: colors.surface, borderColor: colors.surfaceHigh,
    borderRadius: 26, borderWidth: 1, flexDirection: "row", gap: 13,
    marginHorizontal: 20, marginTop: 14, padding: 16,
  },
  profileMark: {
    alignItems: "center", backgroundColor: colors.primary, borderBottomLeftRadius: 18,
    borderTopRightRadius: 18, height: 56, justifyContent: "center", width: 56,
  },
  profileInitial: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 22 },
  profileHeading: { flex: 1, minWidth: 0 },
  profileEyebrow: { color: colors.secondary, fontFamily: "Inter_600SemiBold", fontSize: 9, letterSpacing: 1.3, marginBottom: 2 },
  profileName: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 21, letterSpacing: -0.4, lineHeight: 26 },
  profileEmail: { color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  editMark: { alignItems: "center", backgroundColor: colors.surfaceLow, borderRadius: 13, height: 40, justifyContent: "center", width: 40 },
  content: { gap: 28, paddingBottom: 140, paddingHorizontal: 20, paddingTop: 18 },
  section: { gap: 12 },
  sectionLabel: { color: colors.secondary, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1.3, paddingHorizontal: 2 },
  card: { gap: 10 },
  field: { backgroundColor: colors.surface, borderColor: colors.surfaceHigh, borderRadius: 18, borderWidth: 1, gap: 9, padding: 15 },
  fieldHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  fieldLabelRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  fieldLabel: { color: colors.text, fontFamily: "Inter_500Medium", fontSize: 12 },
  optional: { color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 10 },
  input: { backgroundColor: colors.surfaceLow, borderRadius: 11, color: colors.text, fontFamily: "Inter_400Regular", fontSize: 14, minHeight: 40, paddingHorizontal: 11, paddingVertical: 8 },
  bio: { lineHeight: 20, minHeight: 56 },
  primaryButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 15, justifyContent: "center", minHeight: 52, paddingHorizontal: 18 },
  primaryButtonText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  menuCard: { gap: 10 },
  menuRow: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.surfaceHigh, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 12, minHeight: 76, paddingHorizontal: 14 },
  menuIcon: { alignItems: "center", backgroundColor: "#DDE8E0", borderBottomLeftRadius: 14, borderTopRightRadius: 14, height: 44, justifyContent: "center", width: 44 },
  menuCopy: { flex: 1, gap: 3 },
  menuTitle: { color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  menuDetail: { color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 },
  logout: { alignItems: "center", backgroundColor: "#FFF9F7", borderColor: "#F0D4D0", borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: 12, minHeight: 68, paddingHorizontal: 13 },
  logoutIcon: { alignItems: "center", backgroundColor: colors.errorContainer, borderRadius: 13, height: 42, justifyContent: "center", width: 42 },
  logoutCopy: { flex: 1, gap: 2 },
  logoutText: { color: colors.error, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  logoutDetail: { color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 },
  modalFrame: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(20,25,21,0.35)", ...StyleSheet.absoluteFillObject },
  passwordSheetFrame: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  passwordSheet: { backgroundColor: colors.background, gap: 14, minHeight: 390, paddingHorizontal: 20, paddingTop: 10 },
  sheetHandle: { alignSelf: "center", backgroundColor: colors.outline, borderRadius: 2, height: 4, marginBottom: 4, width: 38 },
  sheetHeading: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  sheetTitle: { color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 21 },
  sheetSubtitle: { color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 3 },
  passwordInput: { backgroundColor: colors.surface, borderColor: colors.surfaceHigh, borderRadius: 14, borderWidth: 1, color: colors.text, fontFamily: "Inter_400Regular", fontSize: 14, minHeight: 52, paddingHorizontal: 15 },
  passwordError: { color: colors.error, fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 17 },
  toast: { alignItems: "center", backgroundColor: "#302F2A", borderRadius: 15, bottom: 118, flexDirection: "row", gap: 9, left: 24, paddingHorizontal: 13, paddingVertical: 12, position: "absolute", right: 24, zIndex: 40 },
  toastText: { color: "#FFFFFF", flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 17 },
});
