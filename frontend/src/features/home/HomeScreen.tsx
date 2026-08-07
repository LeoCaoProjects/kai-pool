import { Button, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../auth/AuthContext";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <View style={{ flex: 1, gap: 12, padding: 16 }}>
      <Text style={{ fontSize: 24 }}>Kai Pool</Text>
      <Text>Signed in as: {user?.name}</Text>
      <Button title="Food Pool" onPress={() => router.push("/(tabs)/food-pool")} />
      <Button title="Scan Food" onPress={() => router.push("/(tabs)/scan")} />
      <Button title="Matches" onPress={() => router.push("/(tabs)/matches")} />
      <Button title="Marketplace" onPress={() => router.push("/(tabs)/marketplace")} />
      <Button title="Profile" onPress={() => router.push("/(tabs)/profile")} />
      {__DEV__ ? <Text>API: {API_BASE_URL}</Text> : null}
    </View>
  );
}
