import Ionicons from "@expo/vector-icons/Ionicons";
import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PageHeader from "../../ui/PageHeader";
import { colors } from "../../ui/theme";
import { getMarketplaceFoods } from "../../api/marketplace";
import { loadScreenCache } from "../../api/screenCache";
import MarketplaceScreen from "../marketplace/MarketplaceScreen";
import { MatchesScreen } from "./MatchesScreen";

type DiscoverSection = "cook" | "food";

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { section: requestedSection } = useLocalSearchParams<{
    section?: string;
  }>();
  const [section, setSection] = useState<DiscoverSection>(
    requestedSection === "food" ? "food" : "cook",
  );
  const [marketplaceView, setMarketplaceView] = useState<
    "available" | "claimed"
  >("available");
  const [refreshingMap, setRefreshingMap] = useState(false);

  const refreshMap = async () => {
    if (refreshingMap) return;
    setRefreshingMap(true);
    try {
      await loadScreenCache(
        "marketplaceAvailable",
        getMarketplaceFoods,
        true,
      );
    } catch {
      // MarketplaceScreen keeps the last cached map visible on refresh errors.
    } finally {
      setRefreshingMap(false);
    }
  };

  useEffect(() => {
    if (requestedSection === "cook" || requestedSection === "food") {
      setSection(requestedSection);
    }
  }, [requestedSection]);

  return (
    <View style={styles.screen}>
      <StatusBar
        backgroundColor={section === "food" ? "transparent" : colors.background}
        style="dark"
        translucent={section === "food"}
      />
      {section === "food" ? (
        <>
          <View style={styles.mapLayer}>
            <MarketplaceScreen view="available" />
          </View>
          {marketplaceView === "claimed" ? (
            <View style={styles.savedLayer}>
              <MarketplaceScreen view="claimed" />
            </View>
          ) : null}
          <MaskedView
            pointerEvents="none"
            maskElement={
              <LinearGradient
                colors={["#000000", "rgba(0,0,0,0.82)", "transparent"]}
                locations={[0, 0.55, 1]}
                style={StyleSheet.absoluteFill}
              />
            }
            style={[styles.statusBlur, { height: insets.top + 22 }]}
          >
            <BlurView intensity={48} style={StyleSheet.absoluteFill} tint="light" />
          </MaskedView>
        </>
      ) : null}
      <View
        style={[
          section === "food" ? styles.floatingControls : undefined,
          { paddingTop: insets.top },
        ]}
      >
        <PageHeader
          action={
            section === "food" ? (
              <Pressable
                accessibilityLabel={
                  marketplaceView === "available"
                    ? "View collected food"
                    : "Return to the map"
                }
                onPress={() =>
                  setMarketplaceView((current) =>
                    current === "available" ? "claimed" : "available",
                  )
                }
                style={styles.collectionButton}
              >
                <Ionicons
                  color={colors.primary}
                  name={
                    marketplaceView === "available"
                      ? "bag-check-outline"
                      : "map-outline"
                  }
                  size={21}
                />
                <Text style={styles.collectionButtonLabel}>
                  {marketplaceView === "available" ? "Saved" : "Map"}
                </Text>
              </Pressable>
            ) : undefined
          }
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
      </View>
      {section === "food" && marketplaceView === "available" ? (
        <Pressable
          accessibilityLabel="Refresh new Kai Pool listings"
          disabled={refreshingMap}
          onPress={() => void refreshMap()}
          style={({ pressed }) => [
            styles.mapRefreshButton,
            { top: insets.top + 178 },
            pressed && styles.mapRefreshPressed,
          ]}
        >
          {refreshingMap ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Ionicons color={colors.primary} name="refresh" size={20} />
          )}
        </Pressable>
      ) : null}
      {section === "cook" ? (
        <View style={styles.content}>
          <MatchesScreen modes={["discover"]} showHeader={false} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  mapLayer: { ...StyleSheet.absoluteFillObject },
  savedLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  floatingControls: { paddingBottom: 12, zIndex: 2 },
  statusBlur: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 3,
  },
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
  content: { flex: 1, zIndex: 1 },
  collectionButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceLow,
    borderColor: colors.surfaceHigh,
    borderRadius: 16,
    borderWidth: 1,
    height: 38,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    width: 82,
  },
  collectionButtonLabel: {
    color: colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  mapRefreshButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.surfaceHigh,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 4,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    shadowColor: "#173124",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    width: 40,
    zIndex: 2,
  },
  mapRefreshPressed: { transform: [{ scale: 0.94 }] },
});
