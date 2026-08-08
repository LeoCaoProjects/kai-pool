import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getClaimedMarketplaceFoods,
  getMarketplaceFoods,
} from "../../api/marketplace";
import type { MarketplaceFoodItem } from "../../types/models";
import { colors } from "../../ui/theme";
import { useAuth } from "../auth/AuthContext";
import type { GiveawayOwner } from "./MarketplaceMap.types";
import MarketplaceMapView from "./MarketplaceMapView";

type MarketplaceTab = "available" | "claimed";

export default function MarketplaceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<MarketplaceTab>("available");
  const [items, setItems] = useState<MarketplaceFoodItem[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadListings = useCallback(
    async (showRefresh = false) => {
      showRefresh ? setRefreshing(true) : setLoading(true);
      setError("");
      try {
        setItems(
          tab === "available"
            ? await getMarketplaceFoods()
            : await getClaimedMarketplaceFoods(),
        );
      } catch {
        setError("We couldn't load nearby giveaways right now.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tab],
  );

  useFocusEffect(
    useCallback(() => {
      void loadListings();
    }, [loadListings]),
  );

  const owners = useMemo<GiveawayOwner[]>(() => {
    const grouped = new Map<number, GiveawayOwner>();
    items.forEach((item) => {
      if (item.ownerLatitude == null || item.ownerLongitude == null) return;
      const existing = grouped.get(item.ownerId);
      if (existing) {
        existing.items.push(item);
        return;
      }
      const markerCoordinate = spreadApproximateMarker(
        item.ownerLatitude,
        item.ownerLongitude,
        item.ownerId,
      );
      grouped.set(item.ownerId, {
        ownerId: item.ownerId,
        ownerName: item.ownerName,
        latitude: markerCoordinate.latitude,
        longitude: markerCoordinate.longitude,
        distanceKm: item.distanceKm,
        items: [item],
      });
    });
    return [...grouped.values()];
  }, [items]);

  useEffect(() => {
    if (
      selectedOwnerId != null &&
      !owners.some((owner) => owner.ownerId === selectedOwnerId)
    ) {
      setSelectedOwnerId(null);
    }
  }, [owners, selectedOwnerId]);

  const selectedOwner =
    owners.find((owner) => owner.ownerId === selectedOwnerId) ?? null;
  const viewerCoordinate =
    user?.latitude != null && user.longitude != null
      ? { latitude: user.latitude, longitude: user.longitude }
      : null;

  if (tab === "claimed") {
    return (
      <View style={styles.screen}>
        <MarketplaceTabs tab={tab} onChange={setTab} floating={false} />
        <ScrollView
          contentContainerStyle={styles.claimedContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadListings(true)}
            />
          }
        >
          <View style={styles.claimedHeading}>
            <Text style={styles.eyebrow}>SAVED FOR PICKUP</Text>
            <Text style={styles.claimedTitle}>My collections</Text>
            <Text style={styles.claimedSubtitle}>
              Everything you have collected, in one place.
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator
              color={colors.primary}
              size="large"
              style={styles.loader}
            />
          ) : null}
          {error ? (
            <ErrorCard message={error} onRetry={() => void loadListings()} />
          ) : null}
          {!loading && !error && items.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  color={colors.primary}
                  name="basket-outline"
                  size={26}
                />
              </View>
              <Text style={styles.emptyTitle}>Nothing collected yet</Text>
              <Text style={styles.emptyText}>
                Choose Nearby food and tap a neighbour on the map to see what
                they are sharing.
              </Text>
            </View>
          ) : null}
          {!loading && !error
            ? items.map((item) => (
                <ClaimedRow
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/marketplace/${item.id}`)}
                />
              ))
            : null}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.mapScreen}>
      <MarketplaceMapView
        onSelectOwner={setSelectedOwnerId}
        owners={owners}
        selectedOwnerId={selectedOwnerId}
        viewerCoordinate={viewerCoordinate}
      />

      <View pointerEvents="box-none" style={styles.mapOverlay}>
        <View style={styles.mapTopRow}>
          <View style={styles.mapTitlePill}>
            <View style={styles.liveDot} />
            <View>
              <Text style={styles.mapTitle}>Kai Pool nearby</Text>
              <Text style={styles.mapMeta}>
                {items.length} item{items.length === 1 ? "" : "s"} from{" "}
                {owners.length} neighbour{owners.length === 1 ? "" : "s"}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Refresh map"
            onPress={() => void loadListings()}
            style={styles.refreshButton}
          >
            <Ionicons color={colors.primary} name="refresh" size={21} />
          </Pressable>
        </View>
        <MarketplaceTabs tab={tab} onChange={setTab} floating />
      </View>

      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : null}
      {error ? (
        <View style={styles.errorOverlay}>
          <ErrorCard message={error} onRetry={() => void loadListings()} />
        </View>
      ) : null}

      {!loading && !error ? (
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {selectedOwner ? (
            <>
              <View style={styles.ownerHeading}>
                <View style={styles.ownerAvatar}>
                  <Text style={styles.ownerInitial}>
                    {selectedOwner.ownerName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.ownerCopy}>
                  <Text numberOfLines={1} style={styles.ownerName}>
                    {selectedOwner.ownerName}
                  </Text>
                  <Text style={styles.ownerDistance}>
                    {selectedOwner.distanceKm == null
                      ? "Nearby"
                      : `About ${selectedOwner.distanceKm.toFixed(1)} km away`}{" "}
                    · approximate area
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close listings"
                  onPress={() => setSelectedOwnerId(null)}
                  style={styles.closeButton}
                >
                  <Ionicons color={colors.textMuted} name="close" size={20} />
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.foodRail}
              >
                {selectedOwner.items.map((item) => (
                  <GiveawayCard
                    key={item.id}
                    item={item}
                    onPress={() => router.push(`/marketplace/${item.id}`)}
                  />
                ))}
              </ScrollView>
            </>
          ) : (
            <View style={styles.sheetIntro}>
              <View style={styles.sheetIcon}>
                <Ionicons color="#FFFFFF" name="gift-outline" size={22} />
              </View>
              <View style={styles.sheetIntroCopy}>
                <Text style={styles.sheetTitle}>
                  {owners.length
                    ? "Tap a neighbour to see their food"
                    : "No giveaways nearby yet"}
                </Text>
                <Text style={styles.sheetText}>
                  {owners.length
                    ? "Number badges show how many free items they have listed."
                    : "New giveaway markers will appear here when neighbours share food."}
                </Text>
              </View>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

// Profiles intentionally store coarse coordinates. A small deterministic spread keeps
// neighbours in the same approximate area from rendering directly on top of one another.
function spreadApproximateMarker(
  latitude: number,
  longitude: number,
  ownerId: number,
) {
  const angle = ((ownerId * 137.508) % 360) * (Math.PI / 180);
  const radius = 0.0018 + (ownerId % 3) * 0.00055;
  return {
    latitude: latitude + Math.cos(angle) * radius,
    longitude: longitude + Math.sin(angle) * radius,
  };
}

function MarketplaceTabs({
  tab,
  onChange,
  floating,
}: {
  tab: MarketplaceTab;
  onChange: (tab: MarketplaceTab) => void;
  floating: boolean;
}) {
  return (
    <View style={[styles.tabs, floating && styles.floatingTabs]}>
      {(["available", "claimed"] as MarketplaceTab[]).map((value) => (
        <Pressable
          key={value}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === value }}
          onPress={() => onChange(value)}
          style={[styles.tab, tab === value && styles.activeTab]}
        >
          <Ionicons
            color={tab === value ? colors.primary : colors.textMuted}
            name={
              value === "available" ? "map-outline" : "checkmark-circle-outline"
            }
            size={16}
          />
          <Text style={[styles.tabText, tab === value && styles.activeTabText]}>
            {value === "available" ? "Nearby food" : "My collections"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function GiveawayCard({
  item,
  onPress,
}: {
  item: MarketplaceFoodItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.giveawayCard, pressed && styles.pressed]}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.giveawayImage} />
      ) : (
        <View style={[styles.giveawayImage, styles.giveawayFallback]}>
          <Ionicons color={colors.accent} name="leaf-outline" size={24} />
        </View>
      )}
      <View style={styles.giveawayCopy}>
        <Text numberOfLines={1} style={styles.giveawayName}>
          {item.name}
        </Text>
        <Text numberOfLines={1} style={styles.giveawayQuantity}>
          {item.quantity || "Quantity not specified"}
        </Text>
        <Text style={styles.viewListing}>View listing →</Text>
      </View>
    </Pressable>
  );
}

function ClaimedRow({
  item,
  onPress,
}: {
  item: MarketplaceFoodItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.claimedRow, pressed && styles.pressed]}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.claimedImage} />
      ) : (
        <View style={[styles.claimedImage, styles.claimedFallback]}>
          <Ionicons color={colors.primary} name="leaf-outline" size={22} />
        </View>
      )}
      <View style={styles.claimedRowCopy}>
        <Text numberOfLines={1} style={styles.claimedName}>
          {item.name}
        </Text>
        <Text style={styles.claimedMeta}>
          From {item.ownerName} · {item.quantity || "Quantity not specified"}
        </Text>
      </View>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
    </Pressable>
  );
}

function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Pressable onPress={onRetry} style={styles.errorCard}>
      <Ionicons color={colors.error} name="cloud-offline-outline" size={22} />
      <Text style={styles.errorText}>{message} Tap to retry.</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  mapScreen: { backgroundColor: "#E9EEE4", flex: 1, overflow: "hidden" },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  mapTopRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  mapTitlePill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 18,
    elevation: 4,
    flex: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: "#173124",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  liveDot: {
    backgroundColor: colors.accent,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  mapTitle: {
    color: colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  mapMeta: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  refreshButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 22,
    elevation: 4,
    height: 44,
    justifyContent: "center",
    shadowColor: "#173124",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    width: 44,
  },
  tabs: {
    backgroundColor: "#E5E2D9",
    borderRadius: 14,
    flexDirection: "row",
    marginHorizontal: 18,
    marginTop: 14,
    padding: 4,
  },
  floatingTabs: {
    backgroundColor: "rgba(245,242,234,0.94)",
    elevation: 3,
    marginHorizontal: 0,
    shadowColor: "#173124",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  tab: {
    alignItems: "center",
    borderRadius: 11,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 8,
  },
  activeTab: { backgroundColor: "#FFFFFF" },
  tabText: {
    color: colors.textMuted,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  activeTabText: { color: colors.primary, fontFamily: "Inter_600SemiBold" },
  loadingOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(253,249,240,0.72)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  errorOverlay: { left: 18, position: "absolute", right: 18, top: 134 },
  errorCard: {
    alignItems: "center",
    backgroundColor: "#FFF1EE",
    borderColor: "#F1C7C1",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 15,
  },
  errorText: {
    color: colors.error,
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    bottom: 0,
    elevation: 14,
    left: 0,
    minHeight: 122,
    paddingBottom: 16,
    position: "absolute",
    right: 0,
    shadowColor: "#173124",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: "#D4D6D0",
    borderRadius: 2,
    height: 4,
    marginBottom: 12,
    marginTop: 9,
    width: 38,
  },
  ownerHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    paddingHorizontal: 18,
  },
  ownerAvatar: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  ownerInitial: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  ownerCopy: { flex: 1 },
  ownerName: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },
  ownerDistance: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 3,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceLow,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  foodRail: { gap: 10, paddingHorizontal: 18, paddingTop: 14 },
  giveawayCard: {
    backgroundColor: colors.surfaceLow,
    borderColor: colors.surfaceHigh,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
    width: 264,
  },
  giveawayImage: { backgroundColor: colors.surfaceHigh, height: 94, width: 88 },
  giveawayFallback: { alignItems: "center", justifyContent: "center" },
  giveawayCopy: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  giveawayName: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  giveawayQuantity: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 4,
  },
  viewListing: {
    color: colors.accent,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    marginTop: 10,
  },
  pressed: { opacity: 0.72 },
  sheetIntro: {
    alignItems: "center",
    flexDirection: "row",
    gap: 13,
    paddingBottom: 7,
    paddingHorizontal: 20,
  },
  sheetIcon: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  sheetIntroCopy: { flex: 1 },
  sheetTitle: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  sheetText: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  claimedContent: { paddingBottom: 42 },
  claimedHeading: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 24 },
  eyebrow: {
    color: colors.accent,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.2,
  },
  claimedTitle: {
    color: colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 27,
    letterSpacing: -0.5,
    marginTop: 7,
  },
  claimedSubtitle: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginTop: 5,
  },
  loader: { marginTop: 38 },
  claimedRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.surfaceHigh,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
    marginHorizontal: 20,
    padding: 10,
  },
  claimedImage: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: 11,
    height: 58,
    width: 58,
  },
  claimedFallback: { alignItems: "center", justifyContent: "center" },
  claimedRowCopy: { flex: 1, gap: 5 },
  claimedName: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  claimedMeta: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 28,
    padding: 28,
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: colors.secondaryContainer,
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    marginTop: 14,
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
});
