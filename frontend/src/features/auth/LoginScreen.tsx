import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ApiError } from "../../api/client";
import { useAuth } from "./AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await login({ email, password });
      router.replace("/(tabs)/home");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", gap: 12, padding: 16 }}>
      <Text style={{ fontSize: 24 }}>Kai Pool</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        value={email}
        style={{ borderWidth: 1, padding: 10 }}
      />
      <TextInput
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        value={password}
        style={{ borderWidth: 1, padding: 10 }}
      />
      {error ? <Text>{error}</Text> : null}
      <Button title={submitting ? "Signing in..." : "Sign in"} disabled={submitting} onPress={submit} />
      <Button title="Create an account" onPress={() => router.push("/register")} />
    </View>
  );
}
