import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ApiError } from "../../api/client";
import {
  getCookingConnections,
  requestCookingConnection,
  respondToCookingConnection,
} from "../../api/connections";
import { getCookingMatches } from "../../api/matches";
import type { CookingConnection, CookingMatch } from "../../types/models";
import { useAuth } from "../auth/AuthContext";
import { ContributionPanel, MealHero, PersonSummary } from "./MatchingComponents";

type Mode = "discover" | "requests" | "connections";

export default function MatchesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("discover");
  const [matches, setMatches] = useState<CookingMatch[]>([]);
  const [connections, setConnections] = useState<CookingConnection[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const [foundMatches, foundConnections] = await Promise.all([
        getCookingMatches(),
        getCookingConnections(),
      ]);
      setMatches(foundMatches);
      setConnections(foundConnections);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load cooking matches.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const pending = useMemo(() => connections.filter((item) => item.status === "PENDING"), [connections]);
  const accepted = useMemo(() => connections.filter((item) => item.status === "ACCEPTED"), [connections]);
  const connectionByUser = useMemo(() => new Map(connections
    .filter((item) => item.status !== "DECLINED")
    .map((item) => [item.otherUserId, item])), [connections]);

  const sendRequest = async (match: CookingMatch) => {
    setBusyId(match.matchedUserId);
    try {
      const created = await requestCookingConnection(match.matchedUserId);
      setConnections((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      Alert.alert("Request sent", `${match.matchedUserName} can now accept or decline your invitation.`);
    } catch (caught) {
      Alert.alert("Could not send request", caught instanceof ApiError ? caught.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const respond = async (connection: CookingConnection, status: "ACCEPTED" | "DECLINED") => {
    setBusyId(connection.id);
    try {
      const updated = await respondToCookingConnection(connection.id, status);
      setConnections((current) => current.map((item) => item.id === updated.id ? updated : item));
      if (status === "ACCEPTED") {
        router.push(`/connection/${updated.id}`);
      }
    } catch (caught) {
      Alert.alert("Could not respond", caught instanceof ApiError ? caught.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#28764a" /><Text style={styles.loadingTitle}>Finding nearby cooks…</Text></View>;
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>COOK TOGETHER</Text>
        <Text style={styles.heading}>Good food is better together.</Text>
        <Text style={styles.intro}>Discover a nearby cook, invite them, and make a plan when they accept.</Text>
      </View>

      <View style={styles.tabs}>
        {(["discover", "requests", "connections"] as Mode[]).map((value) => (
          <Pressable key={value} onPress={() => setMode(value)} style={[styles.tab, mode === value && styles.activeTab]}>
            <Text style={[styles.tabText, mode === value && styles.activeTabText]}>
              {value === "discover" ? "Discover" : value === "requests" ? `Requests${pending.length ? ` (${pending.length})` : ""}` : `Connections${accepted.length ? ` (${accepted.length})` : ""}`}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Pressable onPress={() => void load()} style={styles.messageCard}><Text style={styles.error}>{error} Tap to retry.</Text></Pressable> : null}

      {!error && mode === "discover" ? (
        <>
          {matches.length === 0 ? <Empty text={user?.latitude == null ? "Add your approximate location in Profile to discover nearby cooks." : "Mark ingredients as Cook together to find useful nearby matches."} /> : null}
          {matches.map((match, index) => {
            const meal = match.possibleMeals[0];
            const existing = connectionByUser.get(match.matchedUserId);
            if (!meal) return null;
            return (
              <View key={match.matchedUserId} style={styles.matchCard}>
                <MealHero meal={meal} rank={index + 1} score={match.matchScore} distanceKm={match.distanceKm} />
                <View style={styles.cardBody}>
                  <PersonSummary name={match.matchedUserName} bio={match.matchedUserBio} profileImageUrl={match.matchedUserProfileImageUrl} cultures={match.matchedUserFoodCultures} />
                  <Text style={styles.mealDescription}>{meal.description}</Text>
                  <View style={styles.reasonBox}><Text style={styles.reasonLabel}>WHY YOU MATCH</Text><Text style={styles.reason}>{match.matchReason}</Text></View>
                  <View style={styles.contributions}>
                    <ContributionPanel title="Your matching ingredients" foods={match.yourContributions} tone="you" />
                    <ContributionPanel title={`${match.matchedUserName.split(" ")[0]}'s available ingredients`} foods={match.theirContributions} tone="them" />
                  </View>
                  <View><Text style={styles.alternativeLabel}>Suggested meals</Text><View style={styles.chipRow}>{match.possibleMeals.map((item) => <View key={item.mealName} style={styles.mealChip}><Text style={styles.mealChipText}>{item.mealName}</Text></View>)}</View></View>
                  <View style={styles.actions}>
                    <Pressable style={styles.secondaryButton} onPress={() => router.push(`/match/${match.matchedUserId}`)}><Text style={styles.secondaryButtonText}>View details</Text></Pressable>
                    <Pressable
                      disabled={Boolean(existing) || busyId === match.matchedUserId}
                      style={[styles.primaryButton, existing && styles.disabledButton]}
                      onPress={() => void sendRequest(match)}
                    >
                      {busyId === match.matchedUserId ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>{existing?.status === "ACCEPTED" ? "Connected" : existing ? "Request sent" : "Cook Together"}</Text>}
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </>
      ) : null}

      {!error && mode === "requests" ? (
        <>
          {pending.length === 0 ? <Empty text="No pending cooking requests." /> : pending.map((item) => (
            <View key={item.id} style={styles.connectionCard}>
              <PersonSummary name={item.otherUserName} bio={item.otherUserBio} profileImageUrl={item.otherUserProfileImageUrl} cultures={item.otherUserFoodCultures} />
              <Text style={styles.requestCopy}>{item.incoming ? "Invited you to cook together." : "Waiting for their response."}</Text>
              {item.incoming ? <View style={styles.actions}><Pressable disabled={busyId === item.id} onPress={() => void respond(item, "DECLINED")} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Decline</Text></Pressable><Pressable disabled={busyId === item.id} onPress={() => void respond(item, "ACCEPTED")} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Accept</Text></Pressable></View> : null}
            </View>
          ))}
        </>
      ) : null}

      {!error && mode === "connections" ? (
        <>
          {accepted.length === 0 ? <Empty text="Accepted cooking connections will appear here." /> : accepted.map((item) => (
            <Pressable key={item.id} onPress={() => router.push(`/connection/${item.id}`)} style={styles.connectionCard}>
              <PersonSummary name={item.otherUserName} bio={item.otherUserBio} profileImageUrl={item.otherUserProfileImageUrl} cultures={item.otherUserFoodCultures} />
              <Text style={styles.connectedLabel}>Connected · Plan your cook-up →</Text>
            </Pressable>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

function Empty({ text }: { text: string }) {
  return <View style={styles.messageCard}><Text style={styles.emptyTitle}>Nothing here yet</Text><Text style={styles.intro}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f1e9" },
  screen: { gap: 18, padding: 16, paddingBottom: 48 },
  centered: { alignItems: "center", backgroundColor: "#f3f1e9", flex: 1, gap: 10, justifyContent: "center" },
  loadingTitle: { color: "#173f2d", fontSize: 18, fontWeight: "800" },
  header: { gap: 6, paddingTop: 5 },
  eyebrow: { color: "#28764a", fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  heading: { color: "#173f2d", fontSize: 30, fontWeight: "900", lineHeight: 35 },
  intro: { color: "#596961", lineHeight: 21 },
  tabs: { backgroundColor: "#dfe5dd", borderRadius: 14, flexDirection: "row", padding: 4 },
  tab: { alignItems: "center", borderRadius: 11, flex: 1, paddingHorizontal: 4, paddingVertical: 10 },
  activeTab: { backgroundColor: "white" },
  tabText: { color: "#647067", fontSize: 12, fontWeight: "700" },
  activeTabText: { color: "#205f3d" },
  matchCard: { backgroundColor: "white", borderRadius: 22, elevation: 4, overflow: "hidden", shadowColor: "#173f2d", shadowOpacity: 0.1, shadowRadius: 13 },
  cardBody: { gap: 16, padding: 16 },
  mealDescription: { color: "#3d4d45", fontSize: 15, lineHeight: 22 },
  reasonBox: { backgroundColor: "#eef8f0", borderLeftColor: "#49a66b", borderLeftWidth: 4, borderRadius: 10, gap: 5, padding: 13 },
  reasonLabel: { color: "#28764a", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  reason: { color: "#315440", lineHeight: 20 },
  contributions: { alignItems: "stretch", flexDirection: "row", gap: 10 },
  alternativeLabel: { color: "#65736c", fontSize: 12, fontWeight: "800", marginBottom: 7 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  mealChip: { backgroundColor: "#f1edf5", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  mealChipText: { color: "#67457d", fontSize: 12, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 9 },
  primaryButton: { alignItems: "center", backgroundColor: "#28764a", borderRadius: 13, flex: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 12 },
  primaryButtonText: { color: "white", fontSize: 14, fontWeight: "900" },
  secondaryButton: { alignItems: "center", backgroundColor: "#e4eee7", borderRadius: 13, flex: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 12 },
  secondaryButtonText: { color: "#245f3f", fontWeight: "800" },
  disabledButton: { backgroundColor: "#8ba397" },
  connectionCard: { backgroundColor: "white", borderRadius: 18, gap: 14, padding: 17 },
  requestCopy: { color: "#596961", lineHeight: 20 },
  connectedLabel: { color: "#28764a", fontWeight: "800" },
  messageCard: { backgroundColor: "white", borderRadius: 16, gap: 8, padding: 18 },
  emptyTitle: { color: "#263b31", fontSize: 19, fontWeight: "800" },
  error: { color: "#a12731", lineHeight: 20, textAlign: "center" },
});
