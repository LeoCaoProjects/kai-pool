import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  findNodeHandle,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Keyboard,
} from "react-native";

import { ApiError } from "../../api/client";
import { createFood, deleteFood, getFoods, updateFood } from "../../api/foods";
import { loadScreenCache, peekScreenCache } from "../../api/screenCache";
import type { FoodItem } from "../../types/models";
import type { FoodRequest } from "../../types/requests";
import PageHeader from "../../ui/PageHeader";
import { colors, sharedStyles } from "../../ui/theme";

const shareOptions = ["COOK_TOGETHER", "GIVEAWAY"] as const;
const labelFor = (availability: FoodItem["availability"]) =>
  availability === "GIVEAWAY" ? "Kai Pool" : "Cook Together";
const descriptions: Record<(typeof shareOptions)[number], string> = {
  COOK_TOGETHER: "Use it to find people and meals nearby.",
  GIVEAWAY: "Offer it free for someone nearby to collect.",
};
const emptyDraft = (): FoodRequest => ({
  name: "",
  imageUrl: null,
  quantity: null,
  availability: "COOK_TOGETHER",
});

const addedLabel = (createdAt: string) => {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return "Recently added";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Added just now";
  if (minutes < 60) return `Added ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Added ${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Added ${days} day${days === 1 ? "" : "s"} ago`;
  return `Added ${new Date(createdAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })}`;
};

export default function FoodPoolScreen({
  previewFoods,
}: {
  previewFoods?: FoodItem[];
}) {
  const router = useRouter();
  const previewMode = previewFoods !== undefined;
  const cachedFoods = previewMode ? undefined : peekScreenCache("foods");
  const [foods, setFoods] = useState<FoodItem[]>(
    previewFoods ?? cachedFoods ?? [],
  );
  const [draft, setDraft] = useState<FoodRequest>(emptyDraft);
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(!previewMode && !cachedFoods);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const keyboardLift = useRef(new Animated.Value(0)).current;
  const keyboardVisible = useRef(false);
  const nameInput = useRef<TextInput>(null);
  const quantityInput = useRef<TextInput>(null);
  const sheetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        sheetTranslateY.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 110 || gesture.vy > 0.8) {
          closeForm();
          return;
        }
        Animated.spring(sheetTranslateY, {
          friction: 8,
          tension: 70,
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      keyboardVisible.current = true;
      if (Platform.OS !== "ios") return;
      const height = event.endCoordinates.height;
      Animated.timing(keyboardLift, {
        duration: event.duration || 250,
        toValue: -Math.min(72, height * 0.22),
        useNativeDriver: true,
      }).start();
    });
    const hideSubscription = Keyboard.addListener(hideEvent, (event) => {
      keyboardVisible.current = false;
      if (Platform.OS !== "ios") return;
      Animated.timing(keyboardLift, {
        duration: event.duration || 220,
        toValue: 0,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardLift]);

  const load = useCallback(async (refresh = false) => {
    const hasVisibleData = peekScreenCache("foods") !== undefined;
    if (refresh) setRefreshing(true);
    else if (!hasVisibleData) setLoading(true);
    try {
      const nextFoods = await loadScreenCache("foods", getFoods, true);
      setFoods(nextFoods);
      setError("");
    } catch (caught) {
      if (!hasVisibleData) {
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Could not load your food pool.",
        );
      }
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
    sheetTranslateY.setValue(700);
    setEditing(null);
    setDraft(emptyDraft());
    setError("");
    setShowForm(true);
    requestAnimationFrame(() => {
      Animated.spring(sheetTranslateY, {
        friction: 9,
        tension: 72,
        toValue: 0,
        useNativeDriver: true,
      }).start();
    });
  };

  const openEdit = (food: FoodItem) => {
    sheetTranslateY.setValue(700);
    setEditing(food);
    setDraft({
      name: food.name,
      imageUrl: food.imageUrl,
      quantity: food.quantity,
      availability:
        food.availability === "GIVEAWAY" ? "GIVEAWAY" : "COOK_TOGETHER",
    });
    setError("");
    setShowForm(true);
    requestAnimationFrame(() => {
      Animated.spring(sheetTranslateY, {
        friction: 9,
        tension: 72,
        toValue: 0,
        useNativeDriver: true,
      }).start();
    });
  };

  function closeForm() {
    if (busy) return;
    setShowForm(false);
    keyboardLift.setValue(0);
    sheetTranslateY.setValue(0);
  }

  function handleBackdropPress() {
    if (keyboardVisible.current) {
      Keyboard.dismiss();
      return;
    }
    closeForm();
  }

  function handleSheetTouch(target: string | number) {
    if (!keyboardVisible.current) return;
    const textInputTargets = [
      findNodeHandle(nameInput.current),
      findNodeHandle(quantityInput.current),
    ];
    if (!textInputTargets.some((inputTarget) => `${inputTarget}` === `${target}`)) {
      Keyboard.dismiss();
    }
  }

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
    Alert.alert("Delete food?", `Remove ${food.name} from your Food Pool?`, [
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
    <View style={sharedStyles.screen}>
      <PageHeader
        action={
          <Pressable
            accessibilityLabel="Add food"
            onPress={openNew}
            style={styles.add}
          >
            <Ionicons color="#FFFFFF" name="add" size={24} />
          </Pressable>
        }
        eyebrow="YOUR KITCHEN"
        icon="basket"
        title="Food Pool"
      />
      {foods.length > 0 ? (
        <View style={styles.listHeading}>
          <Text style={styles.listEyebrow}>YOUR INGREDIENTS</Text>
          <Text style={styles.itemCount}>{foods.length} items</Text>
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
          />
        }
      >
        {error && !showForm ? (
          <Pressable onPress={() => void load()} style={styles.error}>
            <Text style={sharedStyles.errorText}>{error} Tap to retry.</Text>
          </Pressable>
        ) : null}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : null}
        {!loading && !error && foods.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyMark}>
              <Ionicons color={colors.primary} name="leaf-outline" size={32} />
            </View>
            <Text style={styles.emptyTitle}>Your Food Pool is empty</Text>
            <Text style={styles.emptyBody}>
              Scan your ingredients or add one manually to start cooking and
              sharing nearby.
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/scan")}
              style={styles.scanButton}
            >
              <Ionicons color="#FFFFFF" name="scan-outline" size={19} />
              <Text style={sharedStyles.primaryButtonText}>Scan food</Text>
            </Pressable>
            <Pressable onPress={openNew} style={styles.manualButton}>
              <Text style={styles.manualButtonText}>Add manually</Text>
            </Pressable>
          </View>
        ) : null}
        {foods.length > 0 ? (
          <View style={styles.listSection}>
            <View style={styles.list}>
              {foods.map((food) => {
                const giveaway = food.availability === "GIVEAWAY";
                return (
                  <Pressable
                    key={food.id}
                    onPress={() => openEdit(food)}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.foodIcon,
                        giveaway && styles.giveawayIcon,
                      ]}
                    >
                      <Ionicons
                        color={giveaway ? colors.accent : colors.primary}
                        name={giveaway ? "gift-outline" : "leaf-outline"}
                        size={21}
                      />
                    </View>
                    <View style={styles.rowCopy}>
                      <View style={styles.nameLine}>
                        <Text numberOfLines={1} style={styles.foodName}>
                          {food.name}
                        </Text>
                        {food.quantity ? (
                          <Text numberOfLines={1} style={styles.quantity}>
                            {food.quantity}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.addedAt}>
                        {addedLabel(food.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.rowMeta}>
                      <Text
                        style={[
                          styles.statusText,
                          giveaway && styles.giveawayText,
                        ]}
                      >
                        {labelFor(food.availability)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        animationType="none"
        onRequestClose={closeForm}
        transparent
        visible={showForm}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Close food form"
            onPress={handleBackdropPress}
            style={styles.backdrop}
          />
          <Animated.View
            onTouchStart={(event) => handleSheetTouch(event.nativeEvent.target)}
            style={[
              styles.sheet,
              {
                transform: [
                  { translateY: sheetTranslateY },
                  { translateY: keyboardLift },
                ],
              },
            ]}
          >
            <View {...sheetPanResponder.panHandlers} style={styles.dragArea}>
              <View style={styles.sheetHandle} />
            </View>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeading}>
                <Text style={styles.sheetEyebrow}>
                  {editing ? "EDIT INGREDIENT" : "NEW INGREDIENT"}
                </Text>
                <Text style={styles.sheetTitle}>
                  {editing ? "Update your food" : "Add to Food Pool"}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close"
                disabled={busy}
                onPress={closeForm}
                style={styles.closeButton}
              >
                <Ionicons color={colors.text} name="close" size={21} />
              </Pressable>
            </View>
            <ScrollView
              automaticallyAdjustKeyboardInsets
              contentContainerStyle={styles.form}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
            >
              <Field label="Food name">
                <TextInput
                  ref={nameInput}
                  value={draft.name}
                  onChangeText={(name) => setDraft({ ...draft, name })}
                  placeholder="Fresh taro root"
                  placeholderTextColor="#7A817C"
                  style={styles.input}
                />
              </Field>
              <Field label="Quantity">
                <TextInput
                  ref={quantityInput}
                  value={draft.quantity ?? ""}
                  onChangeText={(quantity) =>
                    setDraft({ ...draft, quantity: quantity || null })
                  }
                  placeholder="2 kg, 4 pieces, half a bag"
                  placeholderTextColor="#7A817C"
                  style={styles.input}
                />
              </Field>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>How should it be shared?</Text>
                <View style={styles.shareOptions}>
                  {shareOptions.map((option) => {
                    const selected = draft.availability === option;
                    return (
                      <Pressable
                        key={option}
                        onPress={() =>
                          setDraft({ ...draft, availability: option })
                        }
                        style={[
                          styles.shareOption,
                          selected && styles.shareOptionSelected,
                        ]}
                      >
                        <Ionicons
                          color={selected ? "#FFFFFF" : colors.primary}
                          name={
                            option === "GIVEAWAY"
                              ? "gift-outline"
                              : "restaurant-outline"
                          }
                          size={20}
                        />
                        <Text
                          style={[
                            styles.shareTitle,
                            selected && styles.shareTitleSelected,
                          ]}
                        >
                          {labelFor(option)}
                        </Text>
                        <Text
                          style={[
                            styles.shareDescription,
                            selected && styles.shareDescriptionSelected,
                          ]}
                        >
                          {descriptions[option]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              {error ? (
                <View style={sharedStyles.errorBox}>
                  <Text style={sharedStyles.errorText}>{error}</Text>
                </View>
              ) : null}
              {editing ? (
                <Pressable
                  disabled={busy}
                  onPress={() => remove(editing)}
                  style={styles.delete}
                >
                  <Ionicons
                    color={colors.error}
                    name="trash-outline"
                    size={18}
                  />
                  <Text style={styles.deleteText}>Delete ingredient</Text>
                </Pressable>
              ) : null}
            </ScrollView>
            <View style={styles.sheetActions}>
              <Pressable
                disabled={busy}
                onPress={closeForm}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={() => void save()}
                style={styles.saveButton}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.saveText}>
                      {editing ? "Save changes" : "Add food"}
                    </Text>
                    <Ionicons color="#FFFFFF" name="arrow-forward" size={18} />
                  </>
                )}
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
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
  content: { flexGrow: 1, gap: 16, paddingBottom: 48 },
  add: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  error: { marginHorizontal: 20, ...sharedStyles.errorBox },
  loader: { marginTop: 48 },
  listSection: { paddingHorizontal: 20, paddingTop: 4 },
  listHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 10,
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  listEyebrow: {
    color: colors.secondary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
  },
  itemCount: {
    color: colors.textMuted,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  list: { gap: 8 },
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.surfaceHigh,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 13,
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowPressed: { borderColor: colors.outline },
  foodIcon: {
    alignItems: "center",
    backgroundColor: colors.secondaryContainer,
    borderRadius: 13,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  giveawayIcon: { backgroundColor: "#F8E6D8" },
  rowCopy: { flex: 1, gap: 4 },
  nameLine: { alignItems: "baseline", flexDirection: "row", gap: 7 },
  foodName: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  quantity: {
    color: colors.textMuted,
    flexShrink: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    fontStyle: "italic",
  },
  addedAt: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  rowMeta: { alignItems: "center", flexDirection: "row", gap: 7 },
  statusText: {
    color: colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  giveawayText: { color: colors.accent },
  empty: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.surfaceHigh,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 24,
  },
  emptyMark: {
    alignItems: "center",
    backgroundColor: colors.secondaryContainer,
    borderRadius: 24,
    height: 64,
    justifyContent: "center",
    marginBottom: 4,
    width: 64,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
  },
  emptyBody: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  scanButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.primary,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    marginTop: 4,
  },
  manualButton: { padding: 6 },
  manualButtonText: {
    color: colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    backgroundColor: "rgba(10, 18, 13, 0.42)",
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
    overflow: "hidden",
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: colors.outline,
    borderRadius: 2,
    height: 4,
    width: 38,
  },
  dragArea: {
    alignItems: "center",
    minHeight: 28,
    paddingTop: 10,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sheetHeading: { flex: 1, gap: 3 },
  sheetEyebrow: {
    color: colors.secondary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.1,
  },
  sheetTitle: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 22,
    letterSpacing: -0.3,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceLow,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  form: { gap: 17, paddingHorizontal: 20, paddingBottom: 16 },
  field: { gap: 8 },
  fieldLabel: {
    color: colors.textMuted,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  input: {
    backgroundColor: colors.surfaceLow,
    borderColor: colors.surfaceHigh,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 15,
  },
  shareOptions: { flexDirection: "row", gap: 10 },
  shareOption: {
    backgroundColor: colors.surfaceLow,
    borderColor: colors.surfaceHigh,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    minHeight: 126,
    padding: 14,
  },
  shareOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  shareTitle: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    marginTop: 2,
  },
  shareTitleSelected: { color: "#FFFFFF" },
  shareDescription: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  shareDescriptionSelected: { color: "#DDE8E1" },
  delete: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 7,
    paddingVertical: 5,
  },
  deleteText: {
    color: colors.error,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  sheetActions: {
    borderTopColor: colors.surfaceHigh,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  cancelButton: {
    alignItems: "center",
    borderColor: colors.outline,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 20,
  },
  cancelText: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
  },
  saveText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
