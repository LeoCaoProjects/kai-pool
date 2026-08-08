import { StyleSheet } from "react-native";

export const colors = {
  background: "#FDF9F0",
  surface: "#FFFFFF",
  surfaceLow: "#F7F3EA",
  surfaceHigh: "#ECE8DF",
  primary: "#173124",
  primaryContainer: "#2D4739",
  secondary: "#4E635A",
  secondaryContainer: "#CEE5DA",
  accent: "#D17B47",
  text: "#1C1C16",
  textMuted: "#424844",
  outline: "#C2C8C2",
  error: "#BA1A1A",
  errorContainer: "#FFDAD6",
  success: "#2D6B46",
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 };

export const sharedStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },
  display: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 28, letterSpacing: -0.5, lineHeight: 36 },
  headline: { color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 24, lineHeight: 32 },
  title: { color: colors.text, fontFamily: "Inter_500Medium", fontSize: 20, lineHeight: 28 },
  body: { color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 16, lineHeight: 24 },
  label: { color: colors.textMuted, fontFamily: "Inter_500Medium", fontSize: 12, letterSpacing: 0.3, lineHeight: 16 },
  input: { backgroundColor: colors.background, borderColor: colors.outline, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontFamily: "Inter_400Regular", fontSize: 16, minHeight: 56, paddingHorizontal: 16, paddingVertical: 14 },
  primaryButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 56, paddingHorizontal: 20 },
  primaryButtonText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  secondaryButton: { alignItems: "center", backgroundColor: colors.secondaryContainer, borderRadius: radius.md, justifyContent: "center", minHeight: 52, paddingHorizontal: 20 },
  secondaryButtonText: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  card: { backgroundColor: colors.surface, borderColor: colors.surfaceHigh, borderRadius: radius.lg, borderWidth: 1 },
  errorBox: { backgroundColor: colors.errorContainer, borderRadius: radius.md, padding: 12 },
  errorText: { color: colors.error, fontSize: 14, lineHeight: 20 },
});
