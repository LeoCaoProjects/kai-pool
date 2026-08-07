import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Button,
  Image,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError } from "../../api/client";
import { createFood } from "../../api/foods";
import { scanFood } from "../../api/scan";

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
        quality: 0.8,
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
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Photo permission is needed to choose an image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
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
      setItems(response.items.map((item) => ({
        ...item,
        id: nextDraftId++,
        quantity: item.quantity || "",
      })));
      setAnalysed(true);
      if (response.items.length === 0) {
        setMessage("No food was recognised. You can add an item manually or try another photo.");
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not analyse the image.");
    } finally {
      setAnalysing(false);
    }
  };

  const updateItem = (id: number, field: "name" | "quantity", value: string) => {
    setItems((current) => current.map((item) => (
      item.id === id ? { ...item, [field]: value } : item
    )));
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
      await Promise.all(items.map((item) => createFood({
        name: item.name.trim(),
        quantity: item.quantity.trim() || null,
        imageUrl: null,
        availability: "PRIVATE",
      })));
      setSaved(true);
      setMessage("Food saved to your pool.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save the food items.");
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
    <ScrollView contentContainerStyle={{ gap: 12, padding: 16 }}>
      <Text style={{ fontSize: 24 }}>Scan food</Text>
      <Text>Take a clear photo of the food you want to add.</Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button title="Take photo" onPress={() => void takePhoto()} disabled={analysing || saving} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Choose photo" onPress={() => void choosePhoto()} disabled={analysing || saving} />
        </View>
      </View>

      {image ? (
        <Image
          source={{ uri: image.uri }}
          style={{ width: "100%", height: 240, borderRadius: 8 }}
          resizeMode="cover"
        />
      ) : null}

      <Button
        title={analysing ? "Analysing..." : "Analyse photo"}
        onPress={() => void analyse()}
        disabled={!image || analysing || saving}
      />
      {analysing ? <ActivityIndicator /> : null}
      {error ? <Text style={{ color: "#b00020" }}>{error}</Text> : null}
      {message ? <Text style={{ color: saved ? "#16703a" : undefined }}>{message}</Text> : null}

      {analysed && !saved ? (
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 20 }}>Review food</Text>
          {items.map((item, index) => (
            <View key={item.id} style={{ borderWidth: 1, borderRadius: 8, gap: 8, padding: 12 }}>
              <Text>Item {index + 1}</Text>
              <TextInput
                value={item.name}
                onChangeText={(value) => updateItem(item.id, "name", value)}
                placeholder="Food name"
                style={{ borderWidth: 1, padding: 10 }}
              />
              <TextInput
                value={item.quantity}
                onChangeText={(value) => updateItem(item.id, "quantity", value)}
                placeholder="Quantity"
                style={{ borderWidth: 1, padding: 10 }}
              />
              {item.confidence !== null ? (
                <Text>Confidence: {Math.round(item.confidence * 100)}%</Text>
              ) : null}
              <Button title="Remove" onPress={() => removeItem(item.id)} disabled={saving} />
            </View>
          ))}

          <Button title="Add item" onPress={addItem} disabled={saving} />
          <Button
            title={saving ? "Saving..." : "Confirm and save"}
            onPress={() => void saveItems()}
            disabled={saving || saved}
          />
          {saving ? <ActivityIndicator /> : null}
        </View>
      ) : null}

      {saved ? <Button title="View food pool" onPress={() => router.push("/food-pool")} /> : null}
      {(image || analysed) ? <Button title="Scan another" onPress={reset} disabled={analysing || saving} /> : null}
    </ScrollView>
  );
}
