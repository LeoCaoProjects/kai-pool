import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ApiError } from "../../api/client";
import { generateCollaborativeRecipes, getCookingMatch } from "../../api/matches";
import type { CollaborativeMeal, CookingMatch } from "../../types/models";
import { ContributionPanel, MealHero, PersonSummary } from "./MatchingComponents";

export default function MatchDetailsScreen() {
  const params = useLocalSearchParams<{ matchedUserId?: string | string[] }>();
  const rawId = Array.isArray(params.matchedUserId) ? params.matchedUserId[0] : params.matchedUserId;
  const matchedUserId = Number(rawId);
  const [match, setMatch] = useState<CookingMatch | null>(null);
  const [recipes, setRecipes] = useState<CollaborativeMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [recipeError, setRecipeError] = useState("");

  const loadMatch = useCallback(async () => {
    if (!Number.isInteger(matchedUserId) || matchedUserId <= 0) {
      setError("This cooking match is not valid.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setMatch(await getCookingMatch(matchedUserId));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load this cooking match.");
    } finally {
      setLoading(false);
    }
  }, [matchedUserId]);

  useEffect(() => {
    void loadMatch();
  }, [loadMatch]);

  const createRecipes = async () => {
    setGenerating(true);
    setRecipeError("");
    try {
      setRecipes(await generateCollaborativeRecipes(matchedUserId));
    } catch (caught) {
      setRecipeError(caught instanceof ApiError ? caught.message : "Could not create the complete recipes.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#28764a" />
        <Text style={styles.loadingText}>Preparing your match…</Text>
      </View>
    );
  }

  if (error || !match || !match.possibleMeals[0]) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Could not open this match</Text>
        <Text style={styles.error}>{error || "No useful meal is available for this match."}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => void loadMatch()}>
          <Text style={styles.secondaryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const topMeal = match.possibleMeals[0];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.screen}>
      <View style={styles.heroCard}>
        <MealHero meal={topMeal} score={match.matchScore} distanceKm={match.distanceKm} />
        <View style={styles.heroBody}>
          <Text style={styles.description}>{topMeal.description}</Text>
          <PersonSummary
            name={match.matchedUserName}
            bio={match.matchedUserBio}
            profileImageUrl={match.matchedUserProfileImageUrl}
            cultures={match.matchedUserFoodCultures}
          />
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.eyebrow}>THE SHARED POOL</Text>
        <Text style={styles.sectionTitle}>What each person contributes</Text>
        <View style={styles.contributions}>
          <ContributionPanel title="You bring" foods={match.yourContributions} tone="you" />
          <ContributionPanel
            title={`${match.matchedUserName.split(" ")[0]} brings`}
            foods={match.theirContributions}
            tone="them"
          />
        </View>
        <View style={styles.reasonBox}>
          <Text style={styles.reasonLabel}>WHY YOU MATCHED</Text>
          <Text style={styles.reason}>{match.matchReason}</Text>
        </View>
      </View>

      {recipes.length === 0 ? (
        <View style={styles.generatorCard}>
          <Text style={styles.generatorEyebrow}>READY TO COOK?</Text>
          <Text style={styles.generatorTitle}>Turn this match into 3 complete recipes</Text>
          <Text style={styles.generatorCopy}>
            Kai Pool uses both food pools and your selected food cultures to write ingredients and simple instructions.
            The result is cached, so revisiting it will not create another AI recipe unless either food pool changes.
          </Text>
          <View style={styles.previewList}>
            {match.possibleMeals.map((meal, index) => (
              <View key={meal.mealName} style={styles.previewRow}>
                <Text style={styles.previewNumber}>{index + 1}</Text>
                <View style={styles.previewCopy}>
                  <Text style={styles.previewName}>{meal.mealName}</Text>
                  <Text style={styles.previewCulture}>{meal.culturalOrigin}</Text>
                </View>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={generating}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || generating) && styles.buttonPressed,
            ]}
            onPress={() => void createRecipes()}
          >
            {generating ? <ActivityIndicator color="white" /> : null}
            <Text style={styles.primaryButtonText}>
              {generating ? "Creating and finding images…" : "Generate 3 complete recipes"}
            </Text>
          </Pressable>
          {recipeError ? <Text style={styles.error}>{recipeError}</Text> : null}
        </View>
      ) : (
        <View style={styles.recipeSection}>
          <View style={styles.recipeHeadingRow}>
            <View style={styles.recipeHeadingCopy}>
              <Text style={styles.eyebrow}>YOUR SHARED MENU</Text>
              <Text style={styles.sectionTitle}>Three ways to cook together</Text>
            </View>
            <View style={styles.savedPill}><Text style={styles.savedText}>Saved</Text></View>
          </View>
          {recipes.map((recipe, recipeIndex) => (
            <View key={`${recipe.mealName}-${recipeIndex}`} style={styles.recipeCard}>
              <MealHero
                compact
                meal={{
                  mealName: recipe.mealName,
                  description: recipe.description,
                  culturalOrigin: recipe.culturalOriginOrInspiration,
                  imageUrl: recipe.imageUrl,
                  imageAttribution: recipe.imageAttribution,
                }}
              />
              <View style={styles.recipeBody}>
                <Text style={styles.description}>{recipe.description}</Text>
                <View style={styles.recipeContributions}>
                  <View style={styles.recipeContribution}>
                    <Text style={styles.recipeLabel}>YOU USE</Text>
                    <Text style={styles.recipeValue}>{recipe.ingredientsFromYou.join(", ")}</Text>
                  </View>
                  <View style={styles.recipeContribution}>
                    <Text style={styles.recipeLabel}>{match.matchedUserName.split(" ")[0].toUpperCase()} USES</Text>
                    <Text style={styles.recipeValue}>{recipe.ingredientsFromThem.join(", ")}</Text>
                  </View>
                </View>
                {recipe.optionalMissingIngredients.length > 0 ? (
                  <View style={styles.optionalBox}>
                    <Text style={styles.optionalLabel}>OPTIONAL EXTRAS</Text>
                    <Text style={styles.optionalText}>{recipe.optionalMissingIngredients.join(" · ")}</Text>
                  </View>
                ) : null}
                <Text style={styles.instructionsTitle}>How to make it</Text>
                {recipe.cookingInstructions.map((instruction, index) => (
                  <View key={`${recipe.mealName}-step-${index}`} style={styles.instructionRow}>
                    <View style={styles.stepCircle}><Text style={styles.stepNumber}>{index + 1}</Text></View>
                    <Text style={styles.instruction}>{instruction}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f1e9" },
  screen: { gap: 18, padding: 16, paddingBottom: 48 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 28, backgroundColor: "#f3f1e9" },
  loadingText: { color: "#46584f", fontWeight: "700" },
  heroCard: { overflow: "hidden", borderRadius: 22, backgroundColor: "white" },
  heroBody: { gap: 18, padding: 16, paddingTop: 10 },
  description: { color: "#3d4d45", fontSize: 15, lineHeight: 22 },
  sectionCard: { gap: 15, padding: 17, borderRadius: 19, backgroundColor: "white" },
  eyebrow: { color: "#28764a", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  sectionTitle: { color: "#173f2d", fontSize: 23, lineHeight: 27, fontWeight: "900" },
  contributions: { flexDirection: "row", gap: 10 },
  reasonBox: { gap: 5, padding: 13, borderRadius: 12, backgroundColor: "#eef8f0" },
  reasonLabel: { color: "#28764a", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  reason: { color: "#315440", lineHeight: 20 },
  generatorCard: { gap: 14, padding: 19, borderRadius: 20, backgroundColor: "#173f2d" },
  generatorEyebrow: { color: "#a9dfb9", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  generatorTitle: { color: "white", fontSize: 24, lineHeight: 28, fontWeight: "900" },
  generatorCopy: { color: "#d6e7dc", lineHeight: 21 },
  previewList: { gap: 9 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.09)" },
  previewNumber: { width: 25, height: 25, paddingTop: 3, borderRadius: 13, overflow: "hidden", backgroundColor: "#f2c467", color: "#4b3505", fontWeight: "900", textAlign: "center" },
  previewCopy: { flex: 1 },
  previewName: { color: "white", fontWeight: "800" },
  previewCulture: { color: "#bdd2c5", fontSize: 12 },
  primaryButton: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "#df9a32" },
  primaryButtonText: { color: "#332100", fontSize: 15, fontWeight: "900", textAlign: "center" },
  buttonPressed: { opacity: 0.78 },
  recipeSection: { gap: 17 },
  recipeHeadingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  recipeHeadingCopy: { flex: 1, gap: 3 },
  savedPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#d8f5df" },
  savedText: { color: "#21633d", fontSize: 11, fontWeight: "900" },
  recipeCard: { overflow: "hidden", borderRadius: 20, backgroundColor: "white" },
  recipeBody: { gap: 15, padding: 16, paddingTop: 10 },
  recipeContributions: { flexDirection: "row", gap: 9 },
  recipeContribution: { flex: 1, gap: 4, padding: 11, borderRadius: 12, backgroundColor: "#f4f5f2" },
  recipeLabel: { color: "#28764a", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  recipeValue: { color: "#3f5047", fontSize: 13, lineHeight: 18 },
  optionalBox: { gap: 4, padding: 11, borderRadius: 11, backgroundColor: "#fff5df" },
  optionalLabel: { color: "#946017", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  optionalText: { color: "#78572b", fontSize: 13, lineHeight: 18 },
  instructionsTitle: { color: "#21382d", fontSize: 18, fontWeight: "900" },
  instructionRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  stepCircle: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#d8f5df" },
  stepNumber: { color: "#21633d", fontSize: 12, fontWeight: "900" },
  instruction: { flex: 1, color: "#46564e", lineHeight: 20 },
  errorTitle: { color: "#8f1e27", fontSize: 20, fontWeight: "900", textAlign: "center" },
  error: { color: "#a12731", lineHeight: 20, textAlign: "center" },
  secondaryButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: "#e2ece5" },
  secondaryButtonText: { color: "#245f3f", fontWeight: "800" },
});
