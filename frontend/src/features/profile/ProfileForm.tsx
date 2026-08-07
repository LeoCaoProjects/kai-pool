import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { ActivityIndicator, Button, Image, Text, TextInput, View } from "react-native";

import { ApiError } from "../../api/client";
import type { UpdateUserRequest } from "../../types/requests";
import { useAuth } from "../auth/AuthContext";

const splitList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const parseCoordinate = (value: string) => {
  if (!value.trim()) {
    return null;
  }
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : Number.NaN;
};

type ProfileFormProps = {
  title: string;
  submitLabel: string;
  completeOnboarding?: boolean;
  onSaved?: () => void;
};

export default function ProfileForm({
  title,
  submitLabel,
  completeOnboarding = false,
  onSaved,
}: ProfileFormProps) {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [foodCultures, setFoodCultures] = useState("");
  const [foodCulturesToExplore, setFoodCulturesToExplore] = useState("");
  const [saving, setSaving] = useState(false);
  const [findingLocation, setFindingLocation] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }
    setName(user.name);
    setBio(user.bio ?? "");
    setProfileImageUrl(user.profileImageUrl ?? "");
    setLatitude(user.latitude?.toString() ?? "");
    setLongitude(user.longitude?.toString() ?? "");
    setFoodCultures(user.foodCultures.join(", "));
    setFoodCulturesToExplore(user.foodCulturesToExplore.join(", "));
  }, [user]);

  const useApproximateLocation = async () => {
    setFindingLocation(true);
    setError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError("Location permission is needed to use your approximate location.");
        return;
      }
      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLatitude(result.coords.latitude.toFixed(2));
      setLongitude(result.coords.longitude.toFixed(2));
    } catch {
      setError("Could not get your location. You can enter it manually.");
    } finally {
      setFindingLocation(false);
    }
  };

  const save = async () => {
    if (!user) {
      return;
    }

    const parsedLatitude = parseCoordinate(latitude);
    const parsedLongitude = parseCoordinate(longitude);
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    if (Number.isNaN(parsedLatitude) || Number.isNaN(parsedLongitude)) {
      setError("Location coordinates must be numbers.");
      return;
    }
    if ((parsedLatitude === null) !== (parsedLongitude === null)) {
      setError("Enter both location coordinates or leave both empty.");
      return;
    }

    const request: UpdateUserRequest = {
      name: name.trim(),
      bio: bio.trim() || null,
      profileImageUrl: profileImageUrl.trim() || null,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      foodCultures: splitList(foodCultures),
      foodCulturesToExplore: splitList(foodCulturesToExplore),
      onboardingCompleted: completeOnboarding || user.onboardingCompleted,
    };

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateUser(request);
      setMessage("Profile saved.");
      onSaved?.();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 24 }}>{title}</Text>
      <Text>{user?.email}</Text>

      {profileImageUrl ? (
        <Image
          source={{ uri: profileImageUrl }}
          style={{ alignSelf: "center", borderRadius: 60, height: 120, width: 120 }}
        />
      ) : null}
      <TextInput
        autoCapitalize="none"
        keyboardType="url"
        onChangeText={setProfileImageUrl}
        placeholder="Profile photo URL"
        value={profileImageUrl}
        style={{ borderWidth: 1, padding: 10 }}
      />
      <TextInput
        onChangeText={setName}
        placeholder="Name"
        value={name}
        style={{ borderWidth: 1, padding: 10 }}
      />
      <TextInput
        maxLength={300}
        multiline
        onChangeText={setBio}
        placeholder="Short bio"
        value={bio}
        style={{ borderWidth: 1, minHeight: 80, padding: 10 }}
      />

      <Text style={{ fontSize: 18 }}>Approximate location</Text>
      <Text>Your location is rounded to roughly one kilometre.</Text>
      <Button
        title={findingLocation ? "Finding location..." : "Use my approximate location"}
        disabled={findingLocation || saving}
        onPress={() => void useApproximateLocation()}
      />
      {findingLocation ? <ActivityIndicator /> : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          keyboardType="numbers-and-punctuation"
          onChangeText={setLatitude}
          placeholder="Latitude"
          value={latitude}
          style={{ borderWidth: 1, flex: 1, padding: 10 }}
        />
        <TextInput
          keyboardType="numbers-and-punctuation"
          onChangeText={setLongitude}
          placeholder="Longitude"
          value={longitude}
          style={{ borderWidth: 1, flex: 1, padding: 10 }}
        />
      </View>

      <Text style={{ fontSize: 18 }}>Food cultures</Text>
      <Text>Share food traditions you connect with. This is not an ethnicity question.</Text>
      <TextInput
        onChangeText={setFoodCultures}
        placeholder="For example: Māori, Italian"
        value={foodCultures}
        style={{ borderWidth: 1, padding: 10 }}
      />
      <TextInput
        onChangeText={setFoodCulturesToExplore}
        placeholder="Food cultures you want to explore"
        value={foodCulturesToExplore}
        style={{ borderWidth: 1, padding: 10 }}
      />

      {error ? <Text style={{ color: "#b00020" }}>{error}</Text> : null}
      {message ? <Text style={{ color: "#16703a" }}>{message}</Text> : null}
      <Button
        title={saving ? "Saving..." : submitLabel}
        disabled={saving || findingLocation}
        onPress={() => void save()}
      />
      {saving ? <ActivityIndicator /> : null}
    </View>
  );
}
