import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ApiError } from "../../api/client";
import { getCookingMatches } from "../../api/matches";
import type { CookingMatch } from "../../types/models";
import { useAuth } from "../auth/AuthContext";
import { ContributionPanel, MealHero, PersonSummary } from "./MatchingComponents";

export default function MatchesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [matches, setMatches] = useState<CookingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadMatches = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      setMatches(await getCookingMatches());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load cooking matches.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadMatches();
  }, [loadMatches]));

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#28764a" />
        <Text style={styles.loadingTitle}>Finding people you can cook with</Text>
        <Text style={styles.loadingCopy}>Comparing nearby Cook together ingredients…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadMatches(true)} />}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>KAI POOL MATCHES</Text>
        <Text style={styles.heading}>Good food is better together.</Text>
        <Text style={styles.intro}>
          See the meal first, then discover the nearby cook and ingredients that make it possible.
        </Text>
      </View>

      {error ? (
        <View style={styles.messageCard}>
          <Text style={styles.errorTitle}>Matches are unavailable</Text>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.secondaryButton} onPress={() => void loadMatches()}>
            <Text style={styles.secondaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!error && matches.length === 0 ? (
        <View style={styles.messageCard}>
          <Text style={styles.emptyTitle}>No useful nearby matches yet</Text>
          <Text style={styles.intro}>
            {user?.latitude == null || user?.longitude == null
              ? "Add your approximate location in Profile so Kai Pool can find nearby cooks."
              : "Mark ingredients as Cook together and ask nearby friends to do the same. Pull down to check again."}
          </Text>
        </View>
      ) : null}

      {matches.map((match, index) => {
        const topMeal = match.possibleMeals[0];
        if (!topMeal) {
          return null;
        }
        return (
          <View key={match.matchedUserId} style={styles.matchCard}>
            <MealHero
              meal={topMeal}
              rank={index + 1}
              score={match.matchScore}
              distanceKm={match.distanceKm}
            />

            <View style={styles.cardBody}>
              <Text style={styles.mealDescription}>{topMeal.description}</Text>

              <PersonSummary
                name={match.matchedUserName}
                bio={match.matchedUserBio}
                profileImageUrl={match.matchedUserProfileImageUrl}
                cultures={match.matchedUserFoodCultures}
              />

              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>WHY THIS WORKS</Text>
                <Text style={styles.reason}>{match.matchReason}</Text>
              </View>

              <View style={styles.contributions}>
                <ContributionPanel title="You bring" foods={match.yourContributions} tone="you" />
                <ContributionPanel
                  title={`${match.matchedUserName.split(" ")[0]} brings`}
                  foods={match.theirContributions}
                  tone="them"
                />
              </View>

              {match.possibleMeals.length > 1 ? (
                <View style={styles.alternatives}>
                  <Text style={styles.alternativeLabel}>Also possible</Text>
                  <View style={styles.chipRow}>
                    {match.possibleMeals.slice(1).map((meal) => (
                      <View key={meal.mealName} style={styles.mealChip}>
                        <Text style={styles.mealChipText}>{meal.mealName}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                onPress={() => router.push({
                  pathname: "/match/[matchedUserId]",
                  params: { matchedUserId: String(match.matchedUserId) },
                })}
              >
                <Text style={styles.primaryButtonText}>View match and recipes</Text>
                <Text style={styles.arrow}>→</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f1e9" },
  screen: { gap: 20, padding: 16, paddingBottom: 48 },
  centered: { flex: 1, gap: 9, alignItems: "center", justifyContent: "center", padding: 28, backgroundColor: "#f3f1e9" },
  loadingTitle: { color: "#173f2d", fontSize: 18, fontWeight: "800", textAlign: "center" },
  loadingCopy: { color: "#68766f", textAlign: "center" },
  header: { gap: 6, paddingTop: 5 },
  eyebrow: { color: "#28764a", fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  heading: { maxWidth: 330, color: "#173f2d", fontSize: 31, lineHeight: 35, fontWeight: "900" },
  intro: { color: "#596961", lineHeight: 21 },
  matchCard: {
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: "white",
    shadowColor: "#173f2d",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.10,
    shadowRadius: 13,
    elevation: 4,
  },
  cardBody: { gap: 17, padding: 16, paddingTop: 10 },
  mealDescription: { color: "#3d4d45", fontSize: 15, lineHeight: 22 },
  reasonBox: { gap: 5, padding: 13, borderLeftWidth: 4, borderLeftColor: "#49a66b", borderRadius: 10, backgroundColor: "#eef8f0" },
  reasonLabel: { color: "#28764a", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  reason: { color: "#315440", lineHeight: 20 },
  contributions: { flexDirection: "row", gap: 10, alignItems: "stretch" },
  alternatives: { gap: 7 },
  alternativeLabel: { color: "#65736c", fontSize: 12, fontWeight: "800" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  mealChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: "#f1edf5" },
  mealChipText: { color: "#67457d", fontSize: 12, fontWeight: "700" },
  primaryButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9, minHeight: 50, borderRadius: 14, backgroundColor: "#28764a" },
  primaryButtonText: { color: "white", fontSize: 15, fontWeight: "900" },
  arrow: { color: "white", fontSize: 21, fontWeight: "700" },
  buttonPressed: { opacity: 0.82 },
  messageCard: { gap: 12, padding: 18, borderRadius: 16, backgroundColor: "white" },
  emptyTitle: { color: "#263b31", fontSize: 19, fontWeight: "800" },
  errorTitle: { color: "#8f1e27", fontSize: 18, fontWeight: "800" },
  error: { color: "#a12731", lineHeight: 20 },
  secondaryButton: { alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: "#e4eee7" },
  secondaryButtonText: { color: "#245f3f", fontWeight: "800" },
});
