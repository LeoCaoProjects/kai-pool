import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import PageHeader from "../../ui/PageHeader";
import { colors } from "../../ui/theme";
import MarketplaceScreen from "../marketplace/MarketplaceScreen";
import { MatchesScreen } from "./MatchesScreen";

type DiscoverSection = "cook" | "food";

export default function DiscoverScreen() {
  const { section: requestedSection } = useLocalSearchParams<{
    section?: string;
  }>();
  const [section, setSection] = useState<DiscoverSection>(
    requestedSection === "food" ? "food" : "cook",
  );

  useEffect(() => {
    if (requestedSection === "cook" || requestedSection === "food") {
      setSection(requestedSection);
    }
  }, [requestedSection]);

  return (
    <View style={styles.screen}>
      <PageHeader
        eyebrow="YOUR NEIGHBOURHOOD"
        icon="compass"
        title="Discover"
      />
      <View style={styles.switcher}>
        {(["cook", "food"] as const).map((value) => {
          const active = section === value;
          return (
            <Pressable
              key={value}
              onPress={() => setSection(value)}
              style={[styles.option, active && styles.active]}
            >
              <Ionicons
                color={active ? "#FFFFFF" : colors.textMuted}
                name={value === "cook" ? "restaurant-outline" : "gift-outline"}
                size={17}
              />
              <Text style={[styles.label, active && styles.activeLabel]}>
                {value === "cook" ? "Cook Together" : "Kai Pool"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.content}>
        {section === "cook" ? (
          <MatchesScreen modes={["discover"]} showHeader={false} />
        ) : (
          <MarketplaceScreen />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  switcher: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: 16,
    flexDirection: "row",
    marginBottom: 12,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 4,
  },
  option: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 42,
  },
  active: { backgroundColor: colors.primary },
  label: {
    color: colors.textMuted,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  activeLabel: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
  content: { flex: 1 },
});
