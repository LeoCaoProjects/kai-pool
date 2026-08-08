import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError } from "../../api/client";
import { createFood } from "../../api/foods";
import { scanFood } from "../../api/scan";
import { colors, sharedStyles } from "../../ui/theme";

type DraftFood = {
  id: number;
  name: string;
  quantity: string;
  confidence: number | null;
};

let nextDraftId = 1;

export default function ScanScreen() {
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [items, setItems] = useState<DraftFood[]>([]);
  const [analysed, setAnalysed] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const usePickedImage = (asset: ImagePicker.ImagePickerAsset) => {
    setImage(asset);
    setItems([]);
    setAnalysed(false);
    setSaved(false);
    setError("");
    setMessage("");
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("Camera permission is needed to take a photo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.65,
      });
      if (!result.canceled) {
        usePickedImage(result.assets[0]);
      }
    } catch {
      setError("Could not open the camera.");
    }
  };

  const choosePhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Photo permission is needed to choose an image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.65,
      });
      if (!result.canceled) {
        usePickedImage(result.assets[0]);
      }
    } catch {
      setError("Could not open the photo library.");
    }
  };

  const analyse = async () => {
    if (!image) {
      setError("Take a photo or choose one first.");
      return;
    }

    setAnalysing(true);
    setError("");
    setMessage("");
    try {
      const response = await scanFood(image);
      setItems(
        response.items.map((item) => ({
          ...item,
          id: nextDraftId++,
          quantity: item.quantity || "",
        })),
      );
      setAnalysed(true);
      if (response.items.length === 0) {
        setMessage(
          "No food was recognised. You can add an item manually or try another photo.",
        );
      }
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not analyse the image.",
      );
    } finally {
      setAnalysing(false);
    }
  };

  const updateItem = (
    id: number,
    field: "name" | "quantity",
    value: string,
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      { id: nextDraftId++, name: "", quantity: "", confidence: null },
    ]);
    setSaved(false);
    setMessage("");
  };

  const removeItem = (id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const saveItems = async () => {
    if (!image) {
      setError("Choose a photo before saving food.");
      return;
    }
    if (items.length === 0) {
      setError("Add at least one food item before saving.");
      return;
    }
    if (items.some((item) => !item.name.trim())) {
      setError("Each item needs a name.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const imageUrl = image.base64
        ? `data:image/jpeg;base64,${image.base64}`
        : null;
      await Promise.all(
        items.map((item) =>
          createFood({
            name: item.name.trim(),
            quantity: item.quantity.trim() || null,
            imageUrl,
            availability: "PRIVATE",
          }),
        ),
      );
      setSaved(true);
      setMessage("Food saved to your pool.");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not save the food items.",
      );
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setImage(null);
    setItems([]);
    setAnalysed(false);
    setAnalysing(false);
    setSaving(false);
    setSaved(false);
    setError("");
    setMessage("");
  };

  return (
    <ScrollView
      style={sharedStyles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={sharedStyles.display}>Scan food</Text>
      <Text style={sharedStyles.body}>
        Take a clear photo and we’ll identify ingredients for you to review.
      </Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Action
          title="Take photo"
          onPress={() => void takePhoto()}
          disabled={analysing || saving}
        />
        <Action
          title="Choose photo"
          onPress={() => void choosePhoto()}
          disabled={analysing || saving}
          secondary
        />
      </View>

      {image ? (
        <Image
          source={{ uri: image.uri }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : null}

      <Action
        title={analysing ? "Analysing..." : "Analyse photo"}
        onPress={() => void analyse()}
        disabled={!image || analysing || saving}
      />
      {analysing ? <ActivityIndicator /> : null}
      {error ? (
        <View style={sharedStyles.errorBox}>
          <Text style={sharedStyles.errorText}>{error}</Text>
        </View>
      ) : null}
      {message ? (
        <Text style={[styles.message, saved && styles.success]}>{message}</Text>
      ) : null}

      {analysed && !saved ? (
        <View style={{ gap: 12 }}>
          <Text style={sharedStyles.headline}>Review food</Text>
          {items.map((item, index) => (
            <View key={item.id} style={styles.itemCard}>
              <Text style={styles.itemLabel}>ITEM {index + 1}</Text>
              <TextInput
                value={item.name}
                onChangeText={(value) => updateItem(item.id, "name", value)}
                placeholder="Food name"
                style={sharedStyles.input}
              />
              <TextInput
                value={item.quantity}
                onChangeText={(value) => updateItem(item.id, "quantity", value)}
                placeholder="Quantity"
                style={sharedStyles.input}
              />
              {item.confidence !== null ? (
                <Text>Confidence: {Math.round(item.confidence * 100)}%</Text>
              ) : null}
              <Pressable onPress={() => removeItem(item.id)} disabled={saving}>
                <Text style={styles.remove}>Remove item</Text>
              </Pressable>
            </View>
          ))}

          <Action
            title="Add another item"
            onPress={addItem}
            disabled={saving}
            secondary
          />
          <Action
            title={saving ? "Saving..." : "Confirm and save"}
            onPress={() => void saveItems()}
            disabled={saving || saved}
          />
          {saving ? <ActivityIndicator /> : null}
        </View>
      ) : null}

      {saved ? (
        <Action
          title="View Food Pool"
          onPress={() => router.push("/(tabs)/food-pool")}
        />
      ) : null}
      {image || analysed ? (
        <Action
          title="Scan another"
          onPress={reset}
          disabled={analysing || saving}
          secondary
        />
      ) : null}
    </ScrollView>
  );
}

function Action({
  title,
  onPress,
  disabled,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        secondary ? sharedStyles.secondaryButton : sharedStyles.primaryButton,
        styles.action,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={
          secondary
            ? sharedStyles.secondaryButtonText
            : sharedStyles.primaryButtonText
        }
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, padding: 20, paddingBottom: 48 },
  action: { flex: 1 },
  disabled: { opacity: 0.55 },
  image: { borderRadius: 16, height: 260, width: "100%" },
  itemCard: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceHigh,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  itemLabel: {
    color: colors.secondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  remove: {
    color: colors.error,
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 6,
    textAlign: "center",
  },
  message: { color: colors.textMuted, lineHeight: 20 },
  success: { color: colors.success },
});
