import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ApiError } from "../../api/client";
import BrandHeader from "../../ui/BrandHeader";
import { colors, sharedStyles } from "../../ui/theme";
import { useAuth } from "./AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await login({ email: email.trim(), password });
      router.replace("/");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not reach the server. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={sharedStyles.screen}
    >
      <BrandHeader />
      <View style={styles.content}>
        <View style={styles.heading}>
          <Text style={sharedStyles.display}>Log in</Text>
          <Text style={sharedStyles.body}>
            Welcome back to your local food pool.
          </Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="neighbor@example.com"
            placeholderTextColor="#747A75"
            value={email}
            style={sharedStyles.input}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            autoComplete="password"
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor="#747A75"
            secureTextEntry
            value={password}
            style={sharedStyles.input}
          />
        </View>
        {error ? (
          <View style={sharedStyles.errorBox}>
            <Text style={sharedStyles.errorText}>{error}</Text>
          </View>
        ) : null}
        <Pressable
          disabled={submitting}
          onPress={() => void submit()}
          style={[sharedStyles.primaryButton, submitting && styles.disabled]}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={sharedStyles.primaryButtonText}>Log in →</Text>
          )}
        </Pressable>
        <View style={styles.signup}>
          <Text style={sharedStyles.body}>Don’t have an account?</Text>
          <Pressable onPress={() => router.push("/register")}>
            <Text style={styles.link}>Sign up</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 24,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  heading: { alignItems: "center", gap: 8 },
  field: { gap: 8 },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: "500" },
  signup: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 16,
  },
  link: { color: colors.primary, fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.65 },
});
