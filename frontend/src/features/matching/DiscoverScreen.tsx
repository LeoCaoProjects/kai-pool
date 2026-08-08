import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MarketplaceScreen from "../marketplace/MarketplaceScreen";
import { colors } from "../../ui/theme";
import { MatchesScreen } from "./MatchesScreen";

export default function DiscoverScreen() {
  const [section, setSection] = useState<"cook" | "food">("cook");
  return <View style={styles.screen}><View style={styles.switcher}>{(["cook", "food"] as const).map((value) => <Pressable key={value} onPress={() => setSection(value)} style={[styles.option, section === value && styles.active]}><Text style={[styles.label, section === value && styles.activeLabel]}>{value === "cook" ? "Cook Together" : "Free Food"}</Text></Pressable>)}</View><View style={styles.content}>{section === "cook" ? <MatchesScreen modes={["discover"]} /> : <MarketplaceScreen />}</View></View>;
}
const styles = StyleSheet.create({ screen: { backgroundColor: colors.background, flex: 1 }, switcher: { backgroundColor: "#E6E2D9", borderRadius: 12, flexDirection: "row", marginHorizontal: 20, marginTop: 12, padding: 4 }, option: { alignItems: "center", borderRadius: 9, flex: 1, paddingVertical: 9 }, active: { backgroundColor: "white" }, label: { color: colors.textMuted, fontSize: 13, fontWeight: "600" }, activeLabel: { color: colors.primary }, content: { flex: 1 } });
