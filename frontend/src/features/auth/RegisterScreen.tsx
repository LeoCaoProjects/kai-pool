import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
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

type FieldName = "name" | "email" | "password";
type AuthMode = "login" | "register";

export function AuthEntryScreen({ initialMode }: { initialMode: AuthMode }) {
  const router = useRouter();
  const { login, register } = useAuth();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focused, setFocused] = useState<FieldName | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const modeProgress = useRef(new Animated.Value(initialMode === "register" ? 1 : 0)).current;
  const keyboardProgress = useRef(new Animated.Value(0)).current;
  const toastProgress = useRef(new Animated.Value(0)).current;
  const toastBottom = useRef(new Animated.Value(24)).current;

  const changeMode = (next: AuthMode) => {
    if (next === mode) return;
    setError("");
    setMode(next);
    Animated.timing(modeProgress, {
      duration: 420,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      toValue: next === "register" ? 1 : 0,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const animate = (toValue: number, bottom: number, duration: number) => {
      Animated.parallel([
        Animated.timing(keyboardProgress, { duration, toValue, useNativeDriver: false }),
        Animated.timing(toastBottom, { duration, toValue: bottom, useNativeDriver: false }),
      ]).start();
    };
    const show = Keyboard.addListener(showEvent, (event) => animate(
      1,
      Platform.OS === "ios" ? event.endCoordinates.height + 14 : 14,
      event.duration ?? 240,
    ));
    const hide = Keyboard.addListener(hideEvent, (event) =>
      animate(0, 24, event.duration ?? 220));
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
      damping: 18, mass: 0.8, stiffness: 190, toValue: 1, useNativeDriver: false,
    }).start();
    const timer = setTimeout(() => {
      Animated.timing(toastProgress, { duration: 180, toValue: 0, useNativeDriver: false }).start();
    }, 4200);
    return () => clearTimeout(timer);
  }, [error, toastProgress]);

  const submit = async () => {
    if (mode === "login") {
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
      return;
    }
    if (!name.trim()) {
      setError("Tell us what your neighbours should call you.");
      return;
    }
    if (!email.trim()) {
      setError("Enter an email address for your Kai Pool account.");
      return;
    }
    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await register({ name: name.trim(), email: email.trim(), password });
      router.replace("/onboarding");
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message.toLowerCase() : "";
      setError(
        message.includes("email") && message.includes("register")
          ? "That email already belongs to a Kai Pool account."
          : message.includes("server") || !(caught instanceof ApiError)
            ? "Kai Pool cannot reach the server right now. Check your connection and try again."
            : caught instanceof ApiError ? caught.message : "Your account could not be created. Try again.",
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
            height: Animated.add(
              Animated.add(372, Animated.multiply(modeProgress, -62)),
              Animated.multiply(
                keyboardProgress,
                Animated.add(-142, Animated.multiply(modeProgress, 7)),
              ),
            ),
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
                transform: [{ translateY: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }],
              }]}>
                <Animated.Text style={[styles.heroTitle, {
                  opacity: modeProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                }]}>Food is better shared.</Animated.Text>
                <Animated.Text style={[styles.heroTitle, styles.heroTitleOverlay, {
                  opacity: modeProgress,
                }]}>Share what you have.</Animated.Text>
              </Animated.View>
              <Animated.View accessibilityElementsHidden style={[styles.tableScene, {
                opacity: keyboardProgress.interpolate({ inputRange: [0, 0.45], outputRange: [1, 0], extrapolate: "clamp" }),
                transform: [{ scale: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }) }],
              }]}>
                <View style={[styles.ingredient, styles.tomato]}>
                  <Ionicons color="#9C432E" name="nutrition" size={22} />
                </View>
                <View style={[styles.ingredient, styles.leaf]}>
                  <Ionicons color="#315947" name="leaf" size={21} />
                </View>
                <View style={styles.plateOuter}>
                  <View style={styles.plateInner}>
                    <Ionicons color="#D17B47" name="restaurant" size={30} />
                  </View>
                </View>
                <View style={[styles.ingredient, styles.lemon]}>
                  <Ionicons color="#775F18" name="sunny" size={22} />
                </View>
              </Animated.View>
            </SafeAreaView>
          </Animated.View>

          <Animated.View style={[styles.sheet, {
            paddingBottom: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [28, 8] }),
            paddingTop: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [25, 13] }),
          }]}>
            <Animated.View style={[styles.sheetHeading, {
              height: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [58, 0] }),
              marginBottom: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
              opacity: keyboardProgress.interpolate({ inputRange: [0, 0.65], outputRange: [1, 0], extrapolate: "clamp" }),
            }]}>
              <Animated.View style={[styles.modeCopy, {
                opacity: modeProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              }]}>
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>Sign in to continue sharing.</Text>
              </Animated.View>
              <Animated.View style={[styles.modeCopy, styles.modeCopyOverlay, { opacity: modeProgress }]}>
                <Text style={styles.title}>Join Kai Pool</Text>
                <Text style={styles.subtitle}>Your next shared meal starts here.</Text>
              </Animated.View>
            </Animated.View>

            <View style={styles.form}>
              <Animated.View pointerEvents={mode === "register" ? "auto" : "none"} style={{
                height: modeProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 67] }),
                opacity: modeProgress,
                overflow: "hidden",
              }}>
              <AuthField
                autoCapitalize="words"
                focused={focused === "name"}
                icon="person-outline"
                label="Name"
                onBlur={() => setFocused(null)}
                onChangeText={setName}
                onFocus={() => setFocused("name")}
                onSubmitEditing={() => emailRef.current?.focus()}
                placeholder="What should we call you?"
                returnKeyType="next"
                value={name}
              />
              </Animated.View>
              <AuthField
                autoCapitalize="none"
                autoComplete="email"
                focused={focused === "email"}
                icon="mail-outline"
                inputRef={emailRef}
                keyboardType="email-address"
                label="Email"
                onBlur={() => setFocused(null)}
                onChangeText={setEmail}
                onFocus={() => setFocused("email")}
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder="you@example.com"
                returnKeyType="next"
                value={email}
              />
              <AuthField
                autoComplete="new-password"
                focused={focused === "password"}
                icon="lock-closed-outline"
                inputRef={passwordRef}
                label="Password"
                onBlur={() => setFocused(null)}
                onChangeText={setPassword}
                onFocus={() => setFocused("password")}
                onSubmitEditing={() => void submit()}
                onToggleSecure={() => setPasswordVisible((current) => !current)}
                placeholder="At least 8 characters"
                returnKeyType="go"
                secureTextEntry={!passwordVisible}
                secureVisible={passwordVisible}
                value={password}
              />

              <Pressable
                disabled={submitting}
                onPress={() => void submit()}
                style={({ pressed }) => [
                  styles.createButton,
                  pressed && !submitting && styles.buttonPressed,
                  submitting && styles.buttonDisabled,
                ]}
              >
                {submitting ? <ActivityIndicator color="#FFFFFF" /> : (
                  <>
                    <View style={styles.buttonLabelFrame}>
                      <Animated.Text numberOfLines={1} style={[styles.createButtonText, {
                        opacity: modeProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                      }]}>Sign in</Animated.Text>
                      <Animated.Text numberOfLines={1} style={[styles.createButtonText, styles.buttonLabelOverlay, {
                        opacity: modeProgress,
                      }]}>Create account</Animated.Text>
                    </View>
                    <View style={styles.arrowCircle}>
                      <Ionicons color={colors.primary} name="arrow-forward" size={17} />
                    </View>
                  </>
                )}
              </Pressable>
            </View>

            <Animated.View style={[styles.loginClip, {
              height: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }),
              marginTop: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
              opacity: keyboardProgress.interpolate({ inputRange: [0, 0.65], outputRange: [1, 0], extrapolate: "clamp" }),
            }]}>
              <View style={styles.footerModes}>
                <Animated.View pointerEvents={mode === "login" ? "auto" : "none"} style={[styles.loginRow, {
                  opacity: modeProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                }]}>
                  <Text style={styles.loginCopy}>New to the pool?</Text>
                  <Pressable hitSlop={8} onPress={() => changeMode("register")}>
                    <Text style={styles.loginLink}>Create an account</Text>
                  </Pressable>
                </Animated.View>
                <Animated.View pointerEvents={mode === "register" ? "auto" : "none"} style={[styles.loginRow, styles.footerModeOverlay, {
                  opacity: modeProgress,
                }]}>
                  <Text style={styles.loginCopy}>Already have an account?</Text>
                  <Pressable hitSlop={8} onPress={() => changeMode("login")}>
                    <Text style={styles.loginLink}>Sign in</Text>
                  </Pressable>
                </Animated.View>
              </View>
            </Animated.View>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>

      <Animated.View
        accessibilityLiveRegion="polite"
        pointerEvents="none"
        style={[styles.toast, {
          bottom: toastBottom,
          opacity: toastProgress,
          transform: [{
            translateY: toastProgress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
          }],
        }]}
      >
        <View style={styles.toastIcon}>
          <Ionicons color="#FFFFFF" name="alert-circle" size={18} />
        </View>
        <Text style={styles.toastText}>{error}</Text>
      </Animated.View>
    </View>
  );
}

function AuthField({
  focused, icon, inputRef, label, onToggleSecure, secureVisible, ...inputProps
}: React.ComponentProps<typeof TextInput> & {
  focused: boolean;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  inputRef?: React.RefObject<TextInput | null>;
  label: string;
  onToggleSecure?: () => void;
  secureVisible?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputFrame, focused && styles.inputFocused]}>
        <Ionicons color={focused ? colors.primary : colors.secondary} name={icon} size={18} />
        <TextInput
          {...inputProps}
          ref={inputRef}
          placeholderTextColor="#858A85"
          style={styles.input}
        />
        {onToggleSecure ? (
          <Pressable
            accessibilityLabel={secureVisible ? "Hide password" : "Show password"}
            hitSlop={10}
            onPress={onToggleSecure}
          >
            <Ionicons color={colors.secondary} name={secureVisible ? "eye-off-outline" : "eye-outline"} size={20} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function RegisterScreen() {
  return <AuthEntryScreen initialMode="register" />;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  keyboardFrame: { backgroundColor: colors.background, flex: 1 },
  page: { backgroundColor: colors.primary, flex: 1 },
  hero: { backgroundColor: colors.primary, overflow: "hidden", paddingHorizontal: 24 },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 10, paddingTop: 12 },
  brandMark: {
    alignItems: "center", backgroundColor: "#E8DDBE", borderBottomLeftRadius: 13,
    borderTopRightRadius: 13, height: 34, justifyContent: "center", width: 34,
  },
  brand: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 19, letterSpacing: -0.3 },
  heroCopy: { paddingTop: 27 },
  heroTitleOverlay: { left: 0, position: "absolute", top: 27 },
  heroTitle: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 31, letterSpacing: -1.2, lineHeight: 35 },
  tableScene: { height: 88, marginTop: 2, position: "relative" },
  plateOuter: {
    alignItems: "center", backgroundColor: "#F8F0E2", borderRadius: 47, bottom: -35,
    height: 94, justifyContent: "center", left: "46%", marginLeft: -47, position: "absolute", width: 94,
  },
  plateInner: { alignItems: "center", borderColor: "#DDD2C0", borderRadius: 35, borderWidth: 1, height: 70, justifyContent: "center", width: 70 },
  ingredient: { alignItems: "center", justifyContent: "center", position: "absolute" },
  tomato: { backgroundColor: "#EDC3AE", borderRadius: 25, bottom: -19, height: 50, left: 12, transform: [{ rotate: "-14deg" }], width: 50 },
  leaf: { backgroundColor: "#C5DCCB", borderBottomLeftRadius: 20, borderTopRightRadius: 20, bottom: 27, height: 40, left: 76, width: 40 },
  lemon: { backgroundColor: "#E8D99B", borderRadius: 27, bottom: -4, height: 54, right: 32, transform: [{ rotate: "9deg" }], width: 54 },
  sheet: {
    backgroundColor: colors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30,
    flex: 1, marginTop: -38, minHeight: 0, paddingHorizontal: 24,
  },
  sheetHeading: { overflow: "hidden", position: "relative" },
  modeCopy: { gap: 3 },
  modeCopyOverlay: { left: 0, position: "absolute", right: 0, top: 0 },
  title: { color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 24, letterSpacing: -0.5, lineHeight: 31 },
  subtitle: { color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  form: { gap: 12 },
  field: { gap: 5 },
  label: { color: colors.text, fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 0.2 },
  inputFrame: {
    alignItems: "center", backgroundColor: colors.surface, borderColor: colors.surfaceHigh,
    borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 50, paddingHorizontal: 14,
  },
  inputFocused: { borderColor: colors.primary, borderWidth: 1.5 },
  input: { color: colors.text, flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, minHeight: 48, paddingVertical: 0 },
  createButton: {
    alignItems: "center", backgroundColor: colors.primary, borderRadius: 16, flexDirection: "row",
    justifyContent: "space-between", minHeight: 55, paddingLeft: 19, paddingRight: 8,
  },
  createButtonText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  buttonLabelFrame: { justifyContent: "center", minHeight: 20, position: "relative", width: 124 },
  buttonLabelOverlay: { left: 0, position: "absolute", top: 1 },
  arrowCircle: { alignItems: "center", backgroundColor: "#E8DDBE", borderRadius: 20, height: 39, justifyContent: "center", width: 39 },
  buttonPressed: { transform: [{ scale: 0.992 }] },
  buttonDisabled: { opacity: 0.7 },
  loginClip: { overflow: "hidden" },
  footerModes: { minHeight: 20, position: "relative" },
  footerModeOverlay: { left: 0, position: "absolute", right: 0, top: 0 },
  loginRow: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center" },
  loginCopy: { color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 13 },
  loginLink: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  toast: {
    alignItems: "center", backgroundColor: "#302F2A", borderRadius: 16, flexDirection: "row",
    gap: 10, left: 24, paddingHorizontal: 12, paddingVertical: 11, position: "absolute", right: 24, zIndex: 30,
  },
  toastIcon: { alignItems: "center", backgroundColor: colors.error, borderRadius: 15, height: 30, justifyContent: "center", width: 30 },
  toastText: { color: "#FFFFFF", flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 17 },
});
