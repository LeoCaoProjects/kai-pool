import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError } from "../../api/client";
import { createFood, deleteFood, getFoods, updateFood } from "../../api/foods";
import {
  FOOD_AVAILABILITIES,
  type FoodAvailability,
  type FoodItem,
} from "../../types/models";
import type { FoodRequest } from "../../types/requests";

const AVAILABILITY_LABELS: Record<FoodAvailability, string> = {
  PRIVATE: "Private",
  COOK_TOGETHER: "Cook together",
  GIVEAWAY: "Give away",
};

const emptyDraft = (): FoodRequest => ({
  name: "",
  imageUrl: null,
  quantity: null,
  availability: "PRIVATE",
});

type FoodFormProps = {
  draft: FoodRequest;
  submitLabel: string;
  busy: boolean;
  onChange: (draft: FoodRequest) => void;
  onSubmit: () => void;
  onCancel?: () => void;
};

function FoodForm({ draft, submitLabel, busy, onChange, onSubmit, onCancel }: FoodFormProps) {
  return (
    <View style={{ gap: 8 }}>
      {draft.imageUrl ? (
        <Image
          source={{ uri: draft.imageUrl }}
          style={{ borderRadius: 8, height: 180, width: "100%" }}
          resizeMode="cover"
        />
      ) : null}
      <TextInput
        onChangeText={(name) => onChange({ ...draft, name })}
        placeholder="Food name"
        value={draft.name}
        style={{ borderWidth: 1, padding: 10 }}
      />
      <TextInput
        autoCapitalize="none"
        keyboardType="url"
        onChangeText={(imageUrl) => onChange({ ...draft, imageUrl: imageUrl || null })}
        placeholder="Image URL (optional)"
        value={draft.imageUrl ?? ""}
        style={{ borderWidth: 1, padding: 10 }}
      />
      <TextInput
        onChangeText={(quantity) => onChange({ ...draft, quantity: quantity || null })}
        placeholder="Quantity, if known"
        value={draft.quantity ?? ""}
        style={{ borderWidth: 1, padding: 10 }}
      />
      <Text>Availability</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {FOOD_AVAILABILITIES.map((option) => (
          <Pressable
            key={option}
            onPress={() => onChange({ ...draft, availability: option })}
            style={{
              borderWidth: 1,
              borderRadius: 6,
              padding: 8,
              backgroundColor: option === draft.availability ? "#d9f0df" : undefined,
            }}
          >
            <Text>{AVAILABILITY_LABELS[option]}</Text>
          </Pressable>
        ))}
      </View>
      <Button title={busy ? "Saving..." : submitLabel} onPress={onSubmit} disabled={busy} />
      {onCancel ? <Button title="Cancel" onPress={onCancel} disabled={busy} /> : null}
    </View>
  );
}

export default function FoodPoolScreen() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [newFood, setNewFood] = useState<FoodRequest>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<FoodRequest>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFoods = async () => {
    try {
      setFoods(await getFoods());
      setError("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load food.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFoods();
  }, []);

  const addFood = async () => {
    if (!newFood.name.trim()) {
      setError("Enter a food name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await createFood({
        ...newFood,
        name: newFood.name.trim(),
        imageUrl: newFood.imageUrl?.trim() || null,
        quantity: newFood.quantity?.trim() || null,
      });
      setNewFood(emptyDraft());
      await loadFoods();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not add food.");
    } finally {
      setBusy(false);
    }
  };

  const startEditing = (food: FoodItem) => {
    setEditingId(food.id);
    setEditDraft({
      name: food.name,
      imageUrl: food.imageUrl,
      quantity: food.quantity,
      availability: food.availability,
    });
    setError("");
  };

  const saveFood = async () => {
    if (editingId === null || !editDraft.name.trim()) {
      setError("Enter a food name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await updateFood(editingId, {
        ...editDraft,
        name: editDraft.name.trim(),
        imageUrl: editDraft.imageUrl?.trim() || null,
        quantity: editDraft.quantity?.trim() || null,
      });
      setEditingId(null);
      await loadFoods();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update food.");
    } finally {
      setBusy(false);
    }
  };

  const changeAvailability = async (food: FoodItem, availability: FoodAvailability) => {
    setBusy(true);
    setError("");
    try {
      await updateFood(food.id, {
        name: food.name,
        imageUrl: food.imageUrl,
        quantity: food.quantity,
        availability,
      });
      await loadFoods();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update food.");
    } finally {
      setBusy(false);
    }
  };

  const removeFood = async (id: number) => {
    setBusy(true);
    setError("");
    try {
      await deleteFood(id);
      if (editingId === id) setEditingId(null);
      await loadFoods();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not delete food.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = (food: FoodItem) => {
    Alert.alert("Delete food?", `Remove ${food.name} from your food pool?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void removeFood(food.id) },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={{ gap: 16, padding: 16 }}>
      <Text style={{ fontSize: 24 }}>My Food Pool</Text>
      <Text style={{ fontSize: 18 }}>Add food</Text>
      <FoodForm draft={newFood} onChange={setNewFood} onSubmit={() => void addFood()} submitLabel="Add food" busy={busy} />
      {error ? <Text style={{ color: "#b00020" }}>{error}</Text> : null}

      <Text style={{ fontSize: 20 }}>My food</Text>
      {loading ? <Text>Loading...</Text> : null}
      {!loading && foods.length === 0 ? <Text>Your food pool is empty.</Text> : null}
      {foods.map((food) => (
        <View key={food.id} style={{ borderWidth: 1, borderRadius: 8, gap: 8, padding: 12 }}>
          {editingId === food.id ? (
            <FoodForm
              draft={editDraft}
              onChange={setEditDraft}
              onSubmit={() => void saveFood()}
              onCancel={() => setEditingId(null)}
              submitLabel="Save changes"
              busy={busy}
            />
          ) : (
            <>
              {food.imageUrl ? (
                <Image source={{ uri: food.imageUrl }} style={{ borderRadius: 8, height: 180, width: "100%" }} resizeMode="cover" />
              ) : null}
              <Text style={{ fontSize: 18 }}>{food.name}</Text>
              <Text>Quantity: {food.quantity || "Not provided"}</Text>
              <Text>Added: {new Date(food.createdAt).toLocaleDateString()}</Text>
              <Text>Availability: {AVAILABILITY_LABELS[food.availability]}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {FOOD_AVAILABILITIES.map((option) => (
                  <Pressable
                    key={option}
                    disabled={busy || option === food.availability}
                    onPress={() => void changeAvailability(food, option)}
                    style={{ borderWidth: 1, borderRadius: 6, padding: 8, opacity: option === food.availability ? 0.5 : 1 }}
                  >
                    <Text>{AVAILABILITY_LABELS[option]}</Text>
                  </Pressable>
                ))}
              </View>
              <Button title="Edit" onPress={() => startEditing(food)} disabled={busy} />
              <Button title="Delete" onPress={() => confirmDelete(food)} disabled={busy} color="#b00020" />
            </>
          )}
        </View>
      ))}
    </ScrollView>
  );
}
