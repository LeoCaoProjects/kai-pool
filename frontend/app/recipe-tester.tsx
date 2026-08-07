import { useState } from "react";
import { Button, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ApiError } from "../src/api/client";
import { previewRecipeSuggestions } from "../src/api/recipes";
import type { RecipeSuggestion } from "../src/types/requests";

export default function RecipeTesterScreen() {
  const router = useRouter();
  const [ingredients, setIngredients] = useState("chicken, kumara");
  const [results, setResults] = useState<RecipeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runTest = async () => {
    if (!ingredients.trim()) {
      setError("Enter at least one ingredient.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      setResults(await previewRecipeSuggestions(ingredients));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not test recipe matching");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ gap: 14, padding: 20, paddingTop: 56, paddingBottom: 40 }}>
      <Text style={{ fontSize: 28, fontWeight: "700" }}>Recipe tester</Text>
      <Text style={{ color: "#444" }}>
        Test the recipe-matching algorithm without an account. Ingredients are checked against the bundled world-cultures food dataset and are not saved.
      </Text>
      <TextInput
        autoCapitalize="none"
        onChangeText={setIngredients}
        placeholder="e.g. chicken, kumara, rice"
        value={ingredients}
        style={{ borderWidth: 1, borderColor: "#bbb", borderRadius: 8, padding: 12 }}
      />
      <Text style={{ color: "#666" }}>Separate ingredients with commas.</Text>
      <Button title={loading ? "Finding recipes…" : "Find matching recipes"} disabled={loading} onPress={() => void runTest()} />
      {error ? <Text style={{ color: "#b00020" }}>{error}</Text> : null}

      {results.length > 0 ? <Text style={{ fontSize: 20, fontWeight: "600" }}>Recipe matches</Text> : null}
      {results.map((recipe) => (
        <View key={`${recipe.culture}-${recipe.recipeName}`} style={{ gap: 5, borderWidth: 1, borderColor: "#d3e6d7", borderRadius: 8, padding: 12 }}>
          <Text style={{ fontSize: 17, fontWeight: "600" }}>
            {recipe.recipeName} · {recipe.culture} ({recipe.matchPercent}% match)
          </Text>
          <Text>{recipe.description}</Text>
          <Text>You entered: {recipe.matchedIngredients.join(", ")}</Text>
          <Text>Still needed: {recipe.missingIngredients.join(", ")}</Text>
        </View>
      ))}
      {!loading && results.length === 0 && !error ? (
        <Text style={{ color: "#666" }}>Enter ingredients and run the test to see matching recipes.</Text>
      ) : null}

      <View style={{ marginTop: 12, gap: 8 }}>
        <Text style={{ fontWeight: "600" }}>Want to save food to your pool?</Text>
        <Button title="Sign in" onPress={() => router.push("/login")} />
        <Button title="Create account" onPress={() => router.push("/register")} />
      </View>
    </ScrollView>
  );
}
