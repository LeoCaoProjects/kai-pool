import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError } from "../../api/client";
import { createFood, deleteFood, getFoods, updateFood } from "../../api/foods";
import { getRecipeSuggestions } from "../../api/recipes";
import {
  FOOD_AVAILABILITIES,
  type FoodAvailability,
  type FoodItem,
} from "../../types/models";
import type { RecipeSuggestion } from "../../types/requests";

const AVAILABILITY_LABELS: Record<FoodAvailability, string> = {
  PRIVATE: "Private",
  COOK_TOGETHER: "Cook together",
  GIVEAWAY: "Give away",
};

function formatDateAdded(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

type FoodFormState = {
  name: string;
  quantity: string;
  imageUrl: string;
  availability: FoodAvailability;
};

const emptyForm = (): FoodFormState => ({
  name: "",
  quantity: "",
  imageUrl: "",
  availability: "PRIVATE",
});

function foodToForm(food: FoodItem): FoodFormState {
  return {
    name: food.name,
    quantity: food.quantity ?? "",
    imageUrl: food.imageUrl ?? "",
    availability: food.availability,
  };
}

export default function FoodPoolScreen() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [addForm, setAddForm] = useState<FoodFormState>(emptyForm);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [editForm, setEditForm] = useState<FoodFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [testResult, setTestResult] = useState("");

  const loadFoods = useCallback(async () => {
    try {
      const [loadedFoods, loadedSuggestions] = await Promise.all([
        getFoods(),
        getRecipeSuggestions(),
      ]);
      setFoods(loadedFoods);
      setSuggestions(loadedSuggestions);
      setError("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load food pool");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFoods();
  }, [loadFoods]);

  const submitCreate = async () => {
    if (!addForm.name.trim()) {
      setError("Food name is required");
      return;
    }
    setSaving(true);
    try {
      await createFood({
        name: addForm.name.trim(),
        quantity: emptyToNull(addForm.quantity),
        availability: addForm.availability,
        imageUrl: emptyToNull(addForm.imageUrl),
      });
      setAddForm(emptyForm());
      setLoading(true);
      await loadFoods();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not add food");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (food: FoodItem) => {
    setEditingFood(food);
    setEditForm(foodToForm(food));
    setError("");
  };

  const submitEdit = async () => {
    if (!editingFood || !editForm.name.trim()) {
      setError("Food name is required");
      return;
    }
    setSaving(true);
    try {
      await updateFood(editingFood.id, {
        name: editForm.name.trim(),
        quantity: emptyToNull(editForm.quantity),
        availability: editForm.availability,
        imageUrl: emptyToNull(editForm.imageUrl),
      });
      setEditingFood(null);
      setLoading(true);
      await loadFoods();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update food");
    } finally {
      setSaving(false);
    }
  };

  const removeFood = async (id: number) => {
    setSaving(true);
    try {
      await deleteFood(id);
      setLoading(true);
      await loadFoods();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not delete food");
    } finally {
      setSaving(false);
    }
  };

  const setAvailability = async (food: FoodItem, availability: FoodAvailability) => {
    if (food.availability === availability) {
      return;
    }
    setSaving(true);
    try {
      await updateFood(food.id, {
        name: food.name,
        imageUrl: food.imageUrl,
        quantity: food.quantity,
        availability,
      });
      setLoading(true);
      await loadFoods();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not change availability");
    } finally {
      setSaving(false);
    }
  };

  const runCrudCheck = async () => {
    const testName = `Food API test ${new Date().toLocaleTimeString()}`;
    let testFood: FoodItem | null = null;

    setSaving(true);
    setError("");
    setTestResult("Creating a temporary food item…");
    try {
      testFood = await createFood({
        name: testName,
        imageUrl: null,
        quantity: "1 test item",
        availability: "PRIVATE",
      });
      setTestResult("Created. Changing availability…");

      testFood = await updateFood(testFood.id, {
        name: testName,
        imageUrl: null,
        quantity: "2 test items",
        availability: "GIVEAWAY",
      });
      setTestResult("Availability changed. Updating the item…");

      await updateFood(testFood.id, {
        name: `${testName} updated`,
        imageUrl: null,
        quantity: testFood.quantity,
        availability: testFood.availability,
      });
      setTestResult("Updated. Deleting the temporary item…");

      await deleteFood(testFood.id);
      testFood = null;
      setTestResult("Passed: create, availability change, edit, and delete all completed through the live API.");
      await loadFoods();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Food API test failed");
      setTestResult(
        testFood
          ? `Test stopped. Temporary item #${testFood.id} may still be in your pool; you can delete it below.`
          : "Test stopped before a temporary food item was created.",
      );
      await loadFoods();
    } finally {
      setSaving(false);
    }
  };

  const renderAvailabilityPicker = (
    selected: FoodAvailability,
    onSelect: (value: FoodAvailability) => void,
  ) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {FOOD_AVAILABILITIES.map((option) => {
        const active = option === selected;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={{
              borderWidth: 1,
              borderColor: active ? "#2d6a4f" : "#ccc",
              backgroundColor: active ? "#d8f3dc" : "#fff",
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text>{AVAILABILITY_LABELS[option]}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 32 }}>
        <Text style={{ fontSize: 24, fontWeight: "600" }}>My Food Pool</Text>
        <Text style={{ color: "#444" }}>
          Manage food you have scanned or added. Set availability to cook with others or give away.
        </Text>

        <View
          style={{ gap: 8, padding: 12, borderWidth: 1, borderColor: "#b8d8c2", borderRadius: 8, backgroundColor: "#f6fff8" }}
        >
          <Text style={{ fontSize: 18, fontWeight: "500" }}>Food API test</Text>
          <Text style={{ color: "#444" }}>
            Runs a live create, availability change, edit, and delete check using a temporary food item.
          </Text>
          <Button
            title={saving ? "Running test…" : "Run CRUD check"}
            disabled={saving}
            onPress={() => void runCrudCheck()}
          />
          {testResult ? <Text style={{ color: "#245b36" }}>{testResult}</Text> : null}
        </View>

        <View style={{ gap: 10, padding: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: "500" }}>Add food</Text>
          <TextInput
            onChangeText={(name) => setAddForm((current) => ({ ...current, name }))}
            placeholder="Name *"
            value={addForm.name}
            style={{ borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 6 }}
          />
          <TextInput
            onChangeText={(quantity) => setAddForm((current) => ({ ...current, quantity }))}
            placeholder="Quantity (optional)"
            value={addForm.quantity}
            style={{ borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 6 }}
          />
          <TextInput
            onChangeText={(imageUrl) => setAddForm((current) => ({ ...current, imageUrl }))}
            placeholder="Image URL (optional)"
            autoCapitalize="none"
            value={addForm.imageUrl}
            style={{ borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 6 }}
          />
          <Text>Availability</Text>
          {renderAvailabilityPicker(addForm.availability, (availability) =>
            setAddForm((current) => ({ ...current, availability })),
          )}
          <Button
            title={saving ? "Saving…" : "Add to pool"}
            disabled={saving}
            onPress={() => void submitCreate()}
          />
        </View>

        {error ? <Text style={{ color: "#b00020" }}>{error}</Text> : null}

        <Text style={{ fontSize: 18, fontWeight: "500" }}>
          Your items ({foods.length})
        </Text>

        {foods.length === 0 ? (
          <Text style={{ color: "#666" }}>No food yet. Add an item above or use Scan when ready.</Text>
        ) : (
          foods.map((food) => (
            <View
              key={food.id}
              style={{
                gap: 8,
                padding: 12,
                borderWidth: 1,
                borderColor: "#e0e0e0",
                borderRadius: 8,
                backgroundColor: "#fafafa",
              }}
            >
              {food.imageUrl ? (
                <Image
                  source={{ uri: food.imageUrl }}
                  style={{ width: "100%", height: 160, borderRadius: 6, backgroundColor: "#eee" }}
                  resizeMode="cover"
                />
              ) : null}
              <Text style={{ fontSize: 18, fontWeight: "600" }}>{food.name}</Text>
              <Text>Quantity: {food.quantity ?? "Not specified"}</Text>
              <Text>Added: {formatDateAdded(food.createdAt)}</Text>
              <Text>Availability: {AVAILABILITY_LABELS[food.availability]}</Text>
              {renderAvailabilityPicker(food.availability, (availability) =>
                void setAvailability(food, availability),
              )}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Button title="Edit" onPress={() => openEdit(food)} disabled={saving} />
                <Button
                  title="Delete"
                  color="#b00020"
                  onPress={() => void removeFood(food.id)}
                  disabled={saving}
                />
              </View>
            </View>
          ))
        )}

        {foods.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: "500" }}>Recipes you could grow toward</Text>
            <Text style={{ color: "#666" }}>
              Based on your pool and the culture food catalog — shows meals where you already have some
              ingredients.
            </Text>
            {suggestions.length === 0 ? (
              <Text style={{ color: "#666" }}>No partial matches yet. Try adding more ingredients.</Text>
            ) : (
              suggestions.map((recipe) => (
                <View
                  key={`${recipe.culture}-${recipe.recipeName}`}
                  style={{
                    gap: 4,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: "#dce7dc",
                    borderRadius: 8,
                    backgroundColor: "#f6fff8",
                  }}
                >
                  <Text style={{ fontWeight: "600" }}>
                    {recipe.recipeName} ({recipe.culture}) — {recipe.matchPercent}% match
                  </Text>
                  <Text style={{ color: "#444" }}>{recipe.description}</Text>
                  <Text>You have: {recipe.matchedIngredients.join(", ")}</Text>
                  <Text>Still need: {recipe.missingIngredients.join(", ")}</Text>
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={editingFood !== null} animationType="slide" onRequestClose={() => setEditingFood(null)}>
        <ScrollView contentContainerStyle={{ gap: 12, padding: 16, paddingTop: 48 }}>
          <Text style={{ fontSize: 22, fontWeight: "600" }}>Edit food</Text>
          <TextInput
            onChangeText={(name) => setEditForm((current) => ({ ...current, name }))}
            placeholder="Name *"
            value={editForm.name}
            style={{ borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 6 }}
          />
          <TextInput
            onChangeText={(quantity) => setEditForm((current) => ({ ...current, quantity }))}
            placeholder="Quantity (optional)"
            value={editForm.quantity}
            style={{ borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 6 }}
          />
          <TextInput
            onChangeText={(imageUrl) => setEditForm((current) => ({ ...current, imageUrl }))}
            placeholder="Image URL (optional)"
            autoCapitalize="none"
            value={editForm.imageUrl}
            style={{ borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 6 }}
          />
          <Text>Availability</Text>
          {renderAvailabilityPicker(editForm.availability, (availability) =>
            setEditForm((current) => ({ ...current, availability })),
          )}
          <Button title={saving ? "Saving…" : "Save changes"} disabled={saving} onPress={() => void submitEdit()} />
          <Button title="Cancel" onPress={() => setEditingFood(null)} disabled={saving} />
        </ScrollView>
      </Modal>
    </>
  );
}
