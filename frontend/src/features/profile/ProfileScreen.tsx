import { useEffect, useState } from "react";
import { Button, ScrollView, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";

import { ApiError } from "../../api/client";
import { useAuth } from "../auth/AuthContext";

const splitList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [foodCultures, setFoodCultures] = useState("");
  const [foodCulturesToExplore, setFoodCulturesToExplore] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBio(user.bio ?? "");
      setFoodCultures(user.foodCultures.join(", "));
      setFoodCulturesToExplore(user.foodCulturesToExplore.join(", "));
      setLatitude(user.latitude?.toString() ?? "");
      setLongitude(user.longitude?.toString() ?? "");
    }
  }, [user]);

  const save = async () => {
    if (!user) {
      return;
    }
    try {
      await updateUser({
        name,
        bio: bio || null,
        profileImageUrl: user.profileImageUrl,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        foodCultures: splitList(foodCultures),
        foodCulturesToExplore: splitList(foodCulturesToExplore),
      });
      setMessage("Profile saved");
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Could not save profile");
    }
  };

  const signOut = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <ScrollView contentContainerStyle={{ gap: 12, padding: 16 }}>
      <Text style={{ fontSize: 24 }}>Profile</Text>
      <Text>{user?.email}</Text>
      <TextInput
        onChangeText={setName}
        placeholder="Name"
        value={name}
        style={{ borderWidth: 1, padding: 10 }}
      />
      <TextInput
        multiline
        onChangeText={setBio}
        placeholder="Bio"
        value={bio}
        style={{ borderWidth: 1, padding: 10 }}
      />
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={setLatitude}
        placeholder="Map latitude (e.g. -36.991)"
        value={latitude}
        style={{ borderWidth: 1, padding: 10 }}
      />
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={setLongitude}
        placeholder="Map longitude (e.g. 174.861)"
        value={longitude}
        style={{ borderWidth: 1, padding: 10 }}
      />
      <Text style={{ color: "#666" }}>Your map location is used to show your food listings nearby.</Text>
      <TextInput
        onChangeText={setFoodCultures}
        placeholder="Food cultures, separated by commas"
        value={foodCultures}
        style={{ borderWidth: 1, padding: 10 }}
      />
      <TextInput
        onChangeText={setFoodCulturesToExplore}
        placeholder="Cultures to explore, separated by commas"
        value={foodCulturesToExplore}
        style={{ borderWidth: 1, padding: 10 }}
      />
      {message ? <Text>{message}</Text> : null}
      <Button title="Save profile" onPress={save} />
      <Button title="Log out" onPress={signOut} />
    </ScrollView>
  );
}
