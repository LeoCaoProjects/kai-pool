import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "../../api/client";
import { colors } from "../../ui/theme";
import { useAuth } from "./AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const keyboardProgress = useRef(new Animated.Value(0)).current;
  const toastProgress = useRef(new Animated.Value(0)).current;
  const toastBottom = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const animate = (toValue: number, bottom: number, duration = 240) => {
      Animated.parallel([
        Animated.timing(keyboardProgress, {
          duration,
          toValue,
          useNativeDriver: false,
        }),
        Animated.timing(toastBottom, {
          duration,
          toValue: bottom,
          useNativeDriver: false,
        }),
      ]).start();
    };
    const show = Keyboard.addListener(showEvent, (event) => {
      animate(
        1,
        Platform.OS === "ios" ? event.endCoordinates.height + 14 : 14,
        event.duration ?? 240,
      );
    });
    const hide = Keyboard.addListener(hideEvent, (event) => {
      animate(0, 24, event.duration ?? 220);
    });
    return () => { show.remove(); hide.remove(); };
  }, [keyboardProgress, toastBottom]);

  useEffect(() => {
    if (!error) {
      toastProgress.stopAnimation();
      toastProgress.setValue(0);
      return;
    }
    toastProgress.setValue(0);
    Animated.spring(toastProgress, {
      damping: 18,
      mass: 0.8,
      stiffness: 190,
      toValue: 1,
      useNativeDriver: false,
    }).start();
    const timer = setTimeout(() => {
      Animated.timing(toastProgress, {
        duration: 180,
        toValue: 0,
        useNativeDriver: false,
      }).start();
    }, 4200);
    return () => clearTimeout(timer);
  }, [error, toastProgress]);

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
      const message = caught instanceof ApiError ? caught.message.toLowerCase() : "";
      setError(
        message.includes("credential") || message.includes("password")
          ? "That email and password do not match. Try again."
          : message.includes("server") || !(caught instanceof ApiError)
            ? "Kai Pool cannot reach the server right now. Check your connection and try again."
            : caught instanceof ApiError ? caught.message : "Sign in was unsuccessful. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior="height" style={styles.keyboardFrame}>
      <Pressable onPress={Keyboard.dismiss} style={styles.page}>
        <Animated.View style={[styles.hero, {
          height: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [372, 230] }),
        }]}>
          <SafeAreaView edges={["top"]}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Ionicons color={colors.primary} name="leaf" size={17} />
              </View>
              <Text style={styles.brand}>Kai Pool</Text>
            </View>

            <Animated.View style={[styles.heroCopy, {
              opacity: keyboardProgress.interpolate({ inputRange: [0, 0.55], outputRange: [1, 0], extrapolate: "clamp" }),
              transform: [{ translateY: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) }],
            }]}>
              <Text style={styles.heroTitle}>Food is better shared.</Text>
            </Animated.View>

            <Animated.View accessibilityElementsHidden style={[styles.tableScene, {
              opacity: keyboardProgress.interpolate({ inputRange: [0, 0.45], outputRange: [1, 0], extrapolate: "clamp" }),
              transform: [{ scale: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }) }],
            }]}>
              <View style={[styles.ingredient, styles.tomato]}>
                <Ionicons color="#9C432E" name="nutrition" size={24} />
              </View>
              <View style={[styles.ingredient, styles.herb]}>
                <Ionicons color="#315947" name="leaf" size={23} />
              </View>
              <View style={styles.plateOuter}>
                <View style={styles.plateInner}>
                  <Ionicons color="#D17B47" name="restaurant" size={36} />
                </View>
              </View>
              <View style={[styles.ingredient, styles.lemon]}>
                <Ionicons color="#775F18" name="sunny" size={24} />
              </View>
              <View style={[styles.ingredient, styles.bowl]}>
                <Ionicons color="#506AA8" name="water" size={23} />
              </View>
            </Animated.View>
          </SafeAreaView>
        </Animated.View>

        <Animated.View style={[styles.sheet, {
          paddingBottom: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [34, 10] }),
          paddingTop: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [28, 16] }),
        }]}>
          <Animated.View style={[styles.sheetHeading, {
            height: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }),
            marginBottom: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
            opacity: keyboardProgress.interpolate({ inputRange: [0, 0.65], outputRange: [1, 0], extrapolate: "clamp" }),
          }]}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue sharing.</Text>
          </Animated.View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputFrame, focused === "email" && styles.inputFocused]}>
                <Ionicons color={focused === "email" ? colors.primary : colors.secondary} name="mail-outline" size={19} />
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onBlur={() => setFocused(null)}
                  onChangeText={setEmail}
                  onFocus={() => setFocused("email")}
                  onSubmitEditing={() => undefined}
                  placeholder="you@example.com"
                  placeholderTextColor="#858A85"
                  returnKeyType="next"
                  style={styles.input}
                  value={email}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputFrame, focused === "password" && styles.inputFocused]}>
                <Ionicons color={focused === "password" ? colors.primary : colors.secondary} name="lock-closed-outline" size={19} />
                <TextInput
                  autoComplete="password"
                  onBlur={() => setFocused(null)}
                  onChangeText={setPassword}
                  onFocus={() => setFocused("password")}
                  onSubmitEditing={() => void submit()}
                  placeholder="Your password"
                  placeholderTextColor="#858A85"
                  returnKeyType="go"
                  secureTextEntry={!passwordVisible}
                  style={styles.input}
                  value={password}
                />
                <Pressable
                  accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
                  hitSlop={10}
                  onPress={() => setPasswordVisible((current) => !current)}
                >
                  <Ionicons
                    color={colors.secondary}
                    name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                    size={20}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              disabled={submitting}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.loginButton,
                pressed && !submitting && styles.buttonPressed,
                submitting && styles.buttonDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Sign in</Text>
                  <View style={styles.arrowCircle}>
                    <Ionicons color={colors.primary} name="arrow-forward" size={17} />
                  </View>
                </>
              )}
            </Pressable>
          </View>

          <Animated.View style={[styles.signupClip, {
            height: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }),
            marginTop: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
            opacity: keyboardProgress.interpolate({ inputRange: [0, 0.65], outputRange: [1, 0], extrapolate: "clamp" }),
          }]}>
          <View style={styles.signupRow}>
            <Text style={styles.signupCopy}>New to the pool?</Text>
            <Pressable hitSlop={8} onPress={() => router.push("/register")}>
              <Text style={styles.signupLink}>Create an account</Text>
            </Pressable>
          </View>
          </Animated.View>
        </Animated.View>
      </Pressable>
      </KeyboardAvoidingView>
      <Animated.View
        accessibilityLiveRegion="polite"
        pointerEvents="none"
        style={[
          styles.toast,
          {
            bottom: toastBottom,
            opacity: toastProgress,
            transform: [{
              translateY: toastProgress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
            }],
          },
        ]}
      >
        <View style={styles.toastIcon}>
          <Ionicons color="#FFFFFF" name="alert-circle" size={18} />
        </View>
        <Text style={styles.toastText}>{error}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  keyboardFrame: { backgroundColor: colors.background, flex: 1 },
  page: { backgroundColor: colors.primary, flex: 1 },
  hero: {
    backgroundColor: colors.primary,
    overflow: "hidden",
    paddingHorizontal: 24,
  },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 10, paddingTop: 12 },
  brandMark: {
    alignItems: "center",
    backgroundColor: "#E8DDBE",
    borderBottomLeftRadius: 13,
    borderTopRightRadius: 13,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  brand: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 19, letterSpacing: -0.3 },
  heroCopy: { paddingTop: 40 },
  heroTitle: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 34, letterSpacing: -1.3, lineHeight: 40, maxWidth: 330 },
  tableScene: { height: 148, marginTop: 4, position: "relative" },
  plateOuter: {
    alignItems: "center", backgroundColor: "#F8F0E2", borderRadius: 61, bottom: -30,
    height: 122, justifyContent: "center", left: "43%", marginLeft: -61, position: "absolute", width: 122,
  },
  plateInner: { alignItems: "center", borderColor: "#DDD2C0", borderRadius: 46, borderWidth: 1, height: 92, justifyContent: "center", width: 92 },
  ingredient: { alignItems: "center", justifyContent: "center", position: "absolute" },
  tomato: {
    backgroundColor: "#EDC3AE", borderBottomLeftRadius: 29, borderTopLeftRadius: 20,
    borderTopRightRadius: 29, bottom: -7, height: 58, left: -9, transform: [{ rotate: "-16deg" }], width: 58,
  },
  herb: {
    backgroundColor: "#C5DCCB", borderBottomLeftRadius: 20, borderTopRightRadius: 20,
    bottom: 72, height: 40, left: 77, width: 40,
  },
  lemon: {
    backgroundColor: "#E8D99B", borderRadius: 28, bottom: 51, height: 55,
    right: 43, transform: [{ rotate: "8deg" }], width: 55,
  },
  bowl: {
    backgroundColor: "#C7D4EB", borderBottomLeftRadius: 23, borderBottomRightRadius: 23,
    borderTopLeftRadius: 13, borderTopRightRadius: 13, bottom: -15, height: 46,
    right: -3, transform: [{ rotate: "7deg" }], width: 52,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flex: 1,
    marginTop: -42,
    minHeight: 0,
    paddingBottom: 34,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  sheetHeading: { gap: 4, overflow: "hidden" },
  title: { color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 25, letterSpacing: -0.5, lineHeight: 32 },
  subtitle: { color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  form: { gap: 16 },
  field: { gap: 7 },
  label: { color: colors.text, fontFamily: "Inter_500Medium", fontSize: 12, letterSpacing: 0.2 },
  inputFrame: {
    alignItems: "center", backgroundColor: colors.surface, borderColor: colors.surfaceHigh,
    borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 11, minHeight: 55, paddingHorizontal: 15,
  },
  inputFocused: { borderColor: colors.primary, borderWidth: 1.5 },
  input: { color: colors.text, flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, minHeight: 52, paddingVertical: 0 },
  loginButton: {
    alignItems: "center", backgroundColor: colors.primary, borderRadius: 16, flexDirection: "row",
    justifyContent: "space-between", minHeight: 58, paddingLeft: 20, paddingRight: 9,
  },
  loginButtonText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  arrowCircle: { alignItems: "center", backgroundColor: "#E8DDBE", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  buttonPressed: { transform: [{ scale: 0.992 }] },
  buttonDisabled: { opacity: 0.7 },
  signupRow: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center" },
  signupClip: { overflow: "hidden" },
  signupCopy: { color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 13 },
  signupLink: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  toast: {
    alignItems: "center", backgroundColor: "#302F2A", borderRadius: 16,
    flexDirection: "row", gap: 10, left: 24, paddingHorizontal: 12, paddingVertical: 11,
    position: "absolute", right: 24, zIndex: 30,
  },
  toastIcon: { alignItems: "center", backgroundColor: colors.error, borderRadius: 15, height: 30, justifyContent: "center", width: 30 },
  toastText: { color: "#FFFFFF", flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 17 },
});
