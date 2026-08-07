import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ApiError } from "../../api/client";
import { useAuth } from "./AuthContext";

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await register({ name, email, password });
      router.replace("/(tabs)/home");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not register");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", gap: 12, padding: 16 }}>
      <Text style={{ fontSize: 24 }}>Create account</Text>
      <TextInput
        onChangeText={setName}
        placeholder="Name"
        value={name}
        style={{ borderWidth: 1, padding: 10 }}
      />
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
        placeholder="Password (at least 8 characters)"
        secureTextEntry
        value={password}
        style={{ borderWidth: 1, padding: 10 }}
      />
      {error ? <Text>{error}</Text> : null}
      <Button title={submitting ? "Creating..." : "Register"} disabled={submitting} onPress={submit} />
      <Button title="Back to sign in" onPress={() => router.back()} />
    </View>
  );
}
