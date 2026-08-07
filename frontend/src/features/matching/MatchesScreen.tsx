import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Button,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ApiError } from "../../api/client";
import { generateCollaborativeRecipes, getCookingMatches } from "../../api/matches";
import type { CollaborativeMeal, CookingMatch, FoodContribution } from "../../types/models";
import { useAuth } from "../auth/AuthContext";

function ContributionList({ title, foods }: { title: string; foods: FoodContribution[] }) {
  return (
    <View style={styles.contributionColumn}>
      <Text style={styles.columnTitle}>{title}</Text>
      {foods.map((food) => (
        <View key={food.foodId} style={styles.ingredientRow}>
          {food.imageUrl ? <Image source={{ uri: food.imageUrl }} style={styles.foodImage} /> : null}
          <Text style={styles.ingredientText}>
            {food.name}{food.quantity ? ` · ${food.quantity}` : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

function RecipeCard({ recipe, match }: { recipe: CollaborativeMeal; match: CookingMatch }) {
  return (
    <View style={styles.recipeCard}>
      <Text style={styles.recipeTitle}>{recipe.mealName}</Text>
      <Text style={styles.origin}>{recipe.culturalOriginOrInspiration}</Text>
      <Text style={styles.detailLabel}>You bring</Text>
      <Text style={styles.detailText}>{recipe.ingredientsFromYou.join(", ")}</Text>
      <Text style={styles.detailLabel}>{match.matchedUserName} brings</Text>
      <Text style={styles.detailText}>{recipe.ingredientsFromThem.join(", ")}</Text>
      {recipe.optionalMissingIngredients.length > 0 ? (
        <>
          <Text style={styles.detailLabel}>Optional extras</Text>
          <Text style={styles.detailText}>{recipe.optionalMissingIngredients.join(", ")}</Text>
        </>
      ) : null}
      <Text style={styles.detailLabel}>How to make it</Text>
      {recipe.cookingInstructions.map((instruction, index) => (
        <Text key={`${recipe.mealName}-${index}`} style={styles.instruction}>
          {index + 1}. {instruction}
        </Text>
      ))}
    </View>
  );
}

export default function MatchesScreen() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<CookingMatch[]>([]);
  const [recipes, setRecipes] = useState<Record<number, CollaborativeMeal[]>>({});
  const [loadingRecipesFor, setLoadingRecipesFor] = useState<number | null>(null);
  const [recipeErrors, setRecipeErrors] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadMatches = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      setMatches(await getCookingMatches());
      if (refresh) {
        setRecipes({});
        setRecipeErrors({});
      }
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

  const generateRecipes = async (match: CookingMatch) => {
    setLoadingRecipesFor(match.matchedUserId);
    setRecipeErrors((current) => ({ ...current, [match.matchedUserId]: "" }));
    try {
      const result = await generateCollaborativeRecipes(match.matchedUserId);
      setRecipes((current) => ({ ...current, [match.matchedUserId]: result }));
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : "Could not generate meal ideas.";
      setRecipeErrors((current) => ({ ...current, [match.matchedUserId]: message }));
    } finally {
      setLoadingRecipesFor(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#276749" />
        <Text>Finding useful nearby matches...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadMatches(true)} />}
    >
      <Text style={styles.heading}>Cook together</Text>
      <Text style={styles.intro}>
        Matches use only food marked Cook together. Food cultures are preferences for inspiration, not ethnicity.
      </Text>

      {error ? (
        <View style={styles.messageCard}>
          <Text style={styles.error}>{error}</Text>
          <Button title="Try again" onPress={() => void loadMatches()} />
        </View>
      ) : null}

      {!error && matches.length === 0 ? (
        <View style={styles.messageCard}>
          <Text style={styles.emptyTitle}>No useful nearby matches yet</Text>
          <Text style={styles.intro}>
            {user?.latitude === null || user?.longitude === null
              ? "Add your approximate location in Profile so Kai Pool can find nearby cooks."
              : "Mark ingredients as Cook together and ask nearby friends to do the same. Pull down to check again."}
          </Text>
        </View>
      ) : null}

      {matches.map((match, index) => {
        const generatedRecipes = recipes[match.matchedUserId];
        const generating = loadingRecipesFor === match.matchedUserId;
        return (
          <View key={match.matchedUserId} style={styles.matchCard}>
            <View style={styles.profileRow}>
              {match.matchedUserProfileImageUrl ? (
                <Image source={{ uri: match.matchedUserProfileImageUrl }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileFallback}>
                  <Text style={styles.profileInitial}>{match.matchedUserName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.profileText}>
                <Text style={styles.rank}>Match #{index + 1} · {match.matchScore}%</Text>
                <Text style={styles.matchName}>{match.matchedUserName}</Text>
                <Text style={styles.distance}>{match.distanceKm.toFixed(1)} km away</Text>
              </View>
            </View>

            {match.matchedUserBio ? <Text style={styles.bio}>{match.matchedUserBio}</Text> : null}
            {match.matchedUserFoodCultures.length > 0 ? (
              <Text style={styles.cultures}>Food cultures: {match.matchedUserFoodCultures.join(", ")}</Text>
            ) : null}
            <Text style={styles.reason}>{match.matchReason}</Text>

            <View style={styles.contributions}>
              <ContributionList title="You bring" foods={match.yourContributions} />
              <ContributionList title={`${match.matchedUserName} brings`} foods={match.theirContributions} />
            </View>

            <Text style={styles.sectionTitle}>What you could make</Text>
            {match.possibleMeals.map((meal) => (
              <View key={meal.mealName} style={styles.previewCard}>
                <Text style={styles.previewTitle}>{meal.mealName}</Text>
                <Text style={styles.origin}>{meal.culturalOrigin}</Text>
                <Text style={styles.previewContributions}>
                  You: {meal.ingredientsFromYou.join(", ")} · Them: {meal.ingredientsFromThem.join(", ")}
                </Text>
                {meal.optionalMissingIngredients.length > 0 ? (
                  <Text style={styles.optional}>Optional extras: {meal.optionalMissingIngredients.join(", ")}</Text>
                ) : null}
              </View>
            ))}

            {!generatedRecipes ? (
              <Button
                title={generating ? "Creating meal ideas..." : "Create 3 meal ideas"}
                disabled={loadingRecipesFor !== null}
                onPress={() => void generateRecipes(match)}
              />
            ) : (
              <Text style={styles.cacheNote}>Meal ideas are saved until either food pool changes.</Text>
            )}
            {generating ? <ActivityIndicator color="#276749" /> : null}
            {recipeErrors[match.matchedUserId] ? (
              <Text style={styles.error}>{recipeErrors[match.matchedUserId]}</Text>
            ) : null}
            {generatedRecipes?.map((recipe) => (
              <RecipeCard key={recipe.mealName} recipe={recipe} match={match} />
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 16, padding: 16, paddingBottom: 40, backgroundColor: "#f7faf8" },
  centered: { flex: 1, gap: 12, alignItems: "center", justifyContent: "center", padding: 24 },
  heading: { fontSize: 28, fontWeight: "700", color: "#1c4532" },
  intro: { color: "#4a5568", lineHeight: 20 },
  matchCard: { gap: 12, padding: 16, borderRadius: 16, backgroundColor: "white", borderWidth: 1, borderColor: "#c6f6d5" },
  messageCard: { gap: 12, padding: 18, borderRadius: 12, backgroundColor: "white", borderWidth: 1, borderColor: "#e2e8f0" },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#2d3748" },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  profileImage: { width: 64, height: 64, borderRadius: 32 },
  profileFallback: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: "#c6f6d5" },
  profileInitial: { fontSize: 26, fontWeight: "700", color: "#276749" },
  profileText: { flex: 1 },
  rank: { color: "#276749", fontWeight: "700" },
  matchName: { fontSize: 22, fontWeight: "700", color: "#1a202c" },
  distance: { color: "#718096" },
  bio: { color: "#4a5568", lineHeight: 20 },
  cultures: { color: "#4a5568", fontStyle: "italic" },
  reason: { padding: 12, borderRadius: 10, backgroundColor: "#f0fff4", color: "#22543d", lineHeight: 20 },
  contributions: { flexDirection: "row", gap: 10 },
  contributionColumn: { flex: 1, gap: 6, padding: 10, borderRadius: 10, backgroundColor: "#edf2f7" },
  columnTitle: { fontWeight: "700", color: "#2d3748" },
  ingredientRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  foodImage: { width: 28, height: 28, borderRadius: 6 },
  ingredientText: { flex: 1, color: "#4a5568" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#2d3748" },
  previewCard: { gap: 3, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  previewTitle: { fontWeight: "700", color: "#2d3748" },
  previewContributions: { color: "#4a5568", lineHeight: 19 },
  origin: { color: "#6b46c1", fontStyle: "italic" },
  optional: { color: "#718096", fontSize: 13 },
  recipeCard: { gap: 5, padding: 14, borderRadius: 12, backgroundColor: "#fffaf0", borderWidth: 1, borderColor: "#fbd38d" },
  recipeTitle: { fontSize: 18, fontWeight: "700", color: "#7b341e" },
  detailLabel: { marginTop: 4, fontWeight: "700", color: "#4a5568" },
  detailText: { color: "#4a5568" },
  instruction: { color: "#4a5568", lineHeight: 20 },
  error: { color: "#b00020", lineHeight: 20 },
  cacheNote: { color: "#276749", fontSize: 13, textAlign: "center" },
});
