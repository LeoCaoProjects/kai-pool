import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, sharedStyles } from "../../ui/theme";

export default function WelcomeScreen() {
  const router = useRouter();
  return <SafeAreaView edges={["top", "bottom"]} style={[sharedStyles.screen, styles.page]}><View style={styles.mark}><View style={styles.leaf} /><Text style={styles.brand}>Kai Pool</Text></View><View style={styles.copy}><Text style={[sharedStyles.display, styles.center]}>Share food. Cook together.</Text><Text style={[sharedStyles.body, styles.center]}>Turn what you have into meals, connections, and less waste in your neighbourhood.</Text></View><View style={styles.actions}><Pressable onPress={() => router.push("/register")} style={sharedStyles.primaryButton}><Text style={sharedStyles.primaryButtonText}>Join Kai Pool</Text></Pressable><Pressable onPress={() => router.push("/login")} style={sharedStyles.secondaryButton}><Text style={sharedStyles.secondaryButtonText}>Log in</Text></Pressable></View></SafeAreaView>;
}
const styles = StyleSheet.create({ page: { justifyContent: "space-between", paddingHorizontal: 28, paddingBottom: 32, paddingTop: 56 }, mark: { alignItems: "center", gap: 12 }, leaf: { backgroundColor: colors.secondaryContainer, borderBottomLeftRadius: 28, borderTopRightRadius: 28, height: 72, transform: [{ rotate: "-15deg" }], width: 52 }, brand: { color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 24 }, copy: { gap: 12 }, center: { textAlign: "center" }, actions: { gap: 12 } });
