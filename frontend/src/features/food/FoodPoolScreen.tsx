import { useCallback, useState, type ReactNode } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
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
import { colors, sharedStyles } from "../../ui/theme";

const labels: Record<FoodAvailability, string> = {
  PRIVATE: "Private",
  COOK_TOGETHER: "Cook Together",
  GIVEAWAY: "Giveaway",
};

const descriptions: Record<FoodAvailability, string> = {
  PRIVATE: "Only you can see and manage this item.",
  COOK_TOGETHER: "Use this to find people and meals nearby.",
  GIVEAWAY: "Offer this food free to your community.",
};

const emptyDraft = (): FoodRequest => ({
  name: "",
  imageUrl: null,
  quantity: null,
  availability: "PRIVATE",
});

export default function FoodPoolScreen({
  previewFoods,
}: {
  previewFoods?: FoodItem[];
}) {
  const router = useRouter();
  const previewMode = previewFoods !== undefined;
  const [foods, setFoods] = useState<FoodItem[]>(previewFoods ?? []);
  const [draft, setDraft] = useState<FoodRequest>(emptyDraft);
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(!previewMode);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      setFoods(await getFoods());
      setError("");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not load your food pool.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (previewFoods) {
        setFoods(previewFoods);
        setLoading(false);
        setError("");
        return;
      }
      void load();
    }, [load, previewFoods]),
  );

  const openNew = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setShowForm(true);
  };

  const openEdit = (food: FoodItem) => {
    setEditing(food);
    setDraft({
      name: food.name,
      imageUrl: food.imageUrl,
      quantity: food.quantity,
      availability: food.availability,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!draft.name.trim()) {
      setError("Enter a food name.");
      return;
    }

    setBusy(true);
    setError("");
    const request = {
      ...draft,
      name: draft.name.trim(),
      quantity: draft.quantity?.trim() || null,
    };

    try {
      editing
        ? await updateFood(editing.id, request)
        : await createFood(request);
      setShowForm(false);
      setEditing(null);
      setDraft(emptyDraft());
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not save this food.",
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = (food: FoodItem) =>
    Alert.alert("Delete food?", `Remove ${food.name} from your food pool?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await deleteFood(food.id);
            setShowForm(false);
            await load();
          } catch (caught) {
            setError(
              caught instanceof ApiError
                ? caught.message
                : "Could not delete this food.",
            );
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  return (
    <ScrollView
      style={sharedStyles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
        />
      }
    >
      <View style={styles.brand}>
        <Text style={styles.brandText}>Kai Pool</Text>
      </View>

      {showForm ? (
        <View style={styles.form}>
          <Text style={sharedStyles.headline}>
            {editing ? "Edit Food" : "Add Food"}
          </Text>
          <Field label="Food name">
            <TextInput
              value={draft.name}
              onChangeText={(name) => setDraft({ ...draft, name })}
              placeholder="e.g. Fresh taro root"
              placeholderTextColor="#7A817C"
              style={sharedStyles.input}
            />
          </Field>
          <Field label="Quantity / unit">
            <TextInput
              value={draft.quantity ?? ""}
              onChangeText={(quantity) =>
                setDraft({ ...draft, quantity: quantity || null })
              }
              placeholder="e.g. 2 kg"
              placeholderTextColor="#7A817C"
              style={sharedStyles.input}
            />
          </Field>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Share availability</Text>
            {FOOD_AVAILABILITIES.map((option) => (
              <Pressable
                key={option}
                onPress={() => setDraft({ ...draft, availability: option })}
                style={[
                  styles.availability,
                  draft.availability === option && styles.availabilityActive,
                ]}
              >
                <View
                  style={[
                    styles.radio,
                    draft.availability === option && styles.radioActive,
                  ]}
                />
                <View style={styles.availabilityCopy}>
                  <Text style={styles.availabilityTitle}>{labels[option]}</Text>
                  <Text style={styles.availabilityDescription}>
                    {descriptions[option]}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
          {error ? (
            <View style={sharedStyles.errorBox}>
              <Text style={sharedStyles.errorText}>{error}</Text>
            </View>
          ) : null}
          <Pressable
            disabled={busy}
            onPress={() => void save()}
            style={sharedStyles.primaryButton}
          >
            {busy ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={sharedStyles.primaryButtonText}>
                {editing ? "Save changes" : "Add to Food Pool"}
              </Text>
            )}
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => setShowForm(false)}
            style={sharedStyles.secondaryButton}
          >
            <Text style={sharedStyles.secondaryButtonText}>Cancel</Text>
          </Pressable>
          {editing ? (
            <Pressable
              disabled={busy}
              onPress={() => remove(editing)}
              style={styles.delete}
            >
              <Text style={styles.deleteText}>Delete ingredient</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
          <View style={styles.headingRow}>
            <View style={styles.headingCopy}>
              <Text style={sharedStyles.headline}>Local Ingredients</Text>
              <Text style={sharedStyles.body}>
                Available for cooking together or sharing through Kai Pool.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Add food"
              onPress={openNew}
              style={styles.add}
            >
              <Text style={styles.addText}>＋</Text>
            </Pressable>
          </View>

          {error ? (
            <Pressable
              onPress={() => void load()}
              style={sharedStyles.errorBox}
            >
              <Text style={sharedStyles.errorText}>{error} Tap to retry.</Text>
            </Pressable>
          ) : null}
          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : null}
          {!loading && !error && foods.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyMark}>
                <Text style={styles.emptyMarkText}>＋</Text>
              </View>
              <Text style={sharedStyles.headline}>Your Food Pool is empty</Text>
              <Text style={[sharedStyles.body, styles.center]}>
                Add ingredients manually or scan a photo to get started.
              </Text>
              <Pressable
                onPress={() => router.push("/(tabs)/scan")}
                style={sharedStyles.primaryButton}
              >
                <Text style={sharedStyles.primaryButtonText}>Scan food</Text>
              </Pressable>
              <Pressable onPress={openNew} style={sharedStyles.secondaryButton}>
                <Text style={sharedStyles.secondaryButtonText}>
                  Add manually
                </Text>
              </Pressable>
            </View>
          ) : null}
          {foods.length > 0 ? (
            <View style={styles.list}>
              {foods.map((food, index) => (
                <Pressable
                  key={food.id}
                  onPress={() => openEdit(food)}
                  style={[
                    styles.row,
                    index < foods.length - 1 && styles.rowDivider,
                  ]}
                >
                  <View style={styles.rowCopy}>
                    <Text numberOfLines={1} style={styles.foodName}>
                      {food.name}
                    </Text>
                    <Text style={styles.quantity}>
                      {food.quantity || "Quantity not specified"}
                    </Text>
                  </View>
                  <View style={styles.rowMeta}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {labels[food.availability]}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingBottom: 40 },
  brand: {
    borderBottomColor: colors.outline,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  brandText: { color: colors.primary, fontSize: 20, fontWeight: "700" },
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  headingCopy: { flex: 1, gap: 2 },
  add: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  addText: { color: "white", fontSize: 26 },
  loader: { marginTop: 40 },
  list: {
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 20,
    overflow: "hidden",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    minHeight: 78,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomColor: colors.outline,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowCopy: { flex: 1, gap: 5 },
  rowMeta: { alignItems: "center", flexDirection: "row", gap: 10 },
  foodName: { color: colors.text, fontSize: 17, fontWeight: "600" },
  badge: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { color: colors.primary, fontSize: 11, fontWeight: "600" },
  quantity: { color: colors.textMuted, fontSize: 14 },
  chevron: { color: colors.textMuted, fontSize: 26, lineHeight: 26 },
  empty: {
    alignItems: "stretch",
    gap: 14,
    marginHorizontal: 20,
    marginTop: 48,
  },
  emptyMark: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.surfaceHigh,
    borderRadius: 46,
    height: 92,
    justifyContent: "center",
    width: 92,
  },
  emptyMarkText: { color: colors.primary, fontSize: 34 },
  center: { textAlign: "center" },
  form: { gap: 18, padding: 20 },
  field: { gap: 8 },
  fieldLabel: { color: colors.textMuted, fontSize: 14, fontWeight: "500" },
  availability: {
    alignItems: "flex-start",
    borderColor: colors.surfaceHigh,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  availabilityActive: {
    backgroundColor: "#CCEAD6",
    borderColor: colors.primaryContainer,
  },
  radio: {
    borderColor: colors.outline,
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    marginTop: 2,
    width: 20,
  },
  radioActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderWidth: 5,
  },
  availabilityCopy: { flex: 1, gap: 3 },
  availabilityTitle: { color: colors.text, fontSize: 18, fontWeight: "500" },
  availabilityDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  delete: {
    alignItems: "center",
    borderColor: colors.error,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  deleteText: { color: colors.error, fontWeight: "600" },
});
