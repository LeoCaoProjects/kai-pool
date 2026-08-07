import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError } from "../../api/client";
import { getCookingConnection, updateMeetingArrangement } from "../../api/connections";
import type { CookingConnection } from "../../types/models";
import { PersonSummary } from "./MatchingComponents";

export default function ConnectionDetailsScreen() {
  const params = useLocalSearchParams<{ connectionId?: string | string[] }>();
  const rawId = Array.isArray(params.connectionId) ? params.connectionId[0] : params.connectionId;
  const id = Number(rawId);
  const router = useRouter();
  const [connection, setConnection] = useState<CookingConnection | null>(null);
  const [place, setPlace] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) {
      setError("This connection link is invalid.");
      setLoading(false);
      return;
    }
    try {
      const result = await getCookingConnection(id);
      if (result.status !== "ACCEPTED") {
        setError("This cooking request has not been accepted yet.");
        return;
      }
      setConnection(result);
      setPlace(result.meetingPlace || "");
      setTime(result.meetingTime || "");
      setNote(result.meetingNote || "");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load this connection.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateMeetingArrangement(id, {
        meetingPlace: place.trim() || null,
        meetingTime: time.trim() || null,
        meetingNote: note.trim() || null,
      });
      setConnection(updated);
      Alert.alert("Plan saved", "Your cooking partner will see these meeting details.");
    } catch (caught) {
      Alert.alert("Could not save plan", caught instanceof ApiError ? caught.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#28764a" size="large" /></View>;
  if (!connection) return <View style={styles.center}><Text style={styles.errorTitle}>Connection unavailable</Text><Text style={styles.error}>{error}</Text><Pressable onPress={() => router.replace("/(tabs)/matches")} style={styles.backButton}><Text style={styles.backText}>Back to matches</Text></Pressable></View>;

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.page}>
      <View style={styles.connectedBanner}><Text style={styles.connectedEyebrow}>COOKING CONNECTION</Text><Text style={styles.connectedTitle}>You’re connected!</Text><Text style={styles.connectedCopy}>Contact each other and agree on a safe, suitable place and time.</Text></View>
      <View style={styles.card}>
        <PersonSummary name={connection.otherUserName} bio={connection.otherUserBio} profileImageUrl={connection.otherUserProfileImageUrl} cultures={connection.otherUserFoodCultures} />
        <View style={styles.divider} />
        <Text style={styles.label}>CONTACT EMAIL</Text>
        <Pressable disabled={!connection.contactEmail} onPress={() => connection.contactEmail && void Linking.openURL(`mailto:${connection.contactEmail}`)}>
          <Text style={styles.email}>{connection.contactEmail || "Contact unavailable"}</Text>
        </Pressable>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Plan your cook-up</Text>
        <Text style={styles.help}>Either person can update this shared plan.</Text>
        <Text style={styles.fieldLabel}>Place</Text>
        <TextInput value={place} onChangeText={setPlace} maxLength={200} placeholder="e.g. Ōtara Community Kitchen" placeholderTextColor="#8A938D" style={styles.input} />
        <Text style={styles.fieldLabel}>Date and time</Text>
        <TextInput value={time} onChangeText={setTime} maxLength={120} placeholder="e.g. Saturday at 11:00 am" placeholderTextColor="#8A938D" style={styles.input} />
        <Text style={styles.fieldLabel}>Note</Text>
        <TextInput value={note} onChangeText={setNote} maxLength={1000} multiline placeholder="What should each person bring?" placeholderTextColor="#8A938D" style={[styles.input, styles.note]} />
        <Pressable disabled={saving} onPress={() => void save()} style={[styles.saveButton, saving && styles.disabled]}>{saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Save shared plan</Text>}</Pressable>
      </View>
      <View style={styles.safety}><Text style={styles.safetyTitle}>Meet safely</Text><Text style={styles.safetyCopy}>Choose a public or familiar place, confirm dietary needs, and tell someone where you are meeting.</Text></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: "#f3f1e9", flex: 1 },
  content: { gap: 16, padding: 16, paddingBottom: 44 },
  center: { alignItems: "center", backgroundColor: "#f3f1e9", flex: 1, gap: 10, justifyContent: "center", padding: 28 },
  connectedBanner: { backgroundColor: "#173f2d", borderRadius: 20, gap: 7, padding: 20 },
  connectedEyebrow: { color: "#a9dfb9", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  connectedTitle: { color: "white", fontSize: 28, fontWeight: "900" },
  connectedCopy: { color: "#d6e7dc", lineHeight: 21 },
  card: { backgroundColor: "white", borderRadius: 18, gap: 11, padding: 18 },
  divider: { backgroundColor: "#e7e9e5", height: 1, marginVertical: 3 },
  label: { color: "#738078", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  email: { color: "#28764a", fontSize: 16, fontWeight: "800", textDecorationLine: "underline" },
  sectionTitle: { color: "#173f2d", fontSize: 23, fontWeight: "900" },
  help: { color: "#647168", lineHeight: 20, marginBottom: 3 },
  fieldLabel: { color: "#344b40", fontSize: 13, fontWeight: "800", marginTop: 4 },
  input: { backgroundColor: "#f4f5f1", borderColor: "#dce1da", borderRadius: 12, borderWidth: 1, color: "#263b31", fontSize: 15, minHeight: 48, paddingHorizontal: 13, paddingVertical: 11 },
  note: { minHeight: 96, textAlignVertical: "top" },
  saveButton: { alignItems: "center", backgroundColor: "#28764a", borderRadius: 13, justifyContent: "center", marginTop: 7, minHeight: 50 },
  saveText: { color: "white", fontSize: 15, fontWeight: "900" },
  disabled: { opacity: 0.65 },
  safety: { backgroundColor: "#fff5df", borderRadius: 16, gap: 5, padding: 16 },
  safetyTitle: { color: "#80551a", fontSize: 16, fontWeight: "900" },
  safetyCopy: { color: "#755c39", lineHeight: 20 },
  errorTitle: { color: "#263b31", fontSize: 22, fontWeight: "900", textAlign: "center" },
  error: { color: "#68736c", lineHeight: 21, textAlign: "center" },
  backButton: { backgroundColor: "#e2ece5", borderRadius: 12, marginTop: 10, paddingHorizontal: 16, paddingVertical: 12 },
  backText: { color: "#245f3f", fontWeight: "800" },
});
