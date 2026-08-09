import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  claimMarketplaceFood,
  getClaimedMarketplaceFoods,
  getMarketplaceFoods,
} from "../../api/marketplace";
import {
  loadScreenCache,
  peekScreenCache,
  subscribeScreenCache,
  updateScreenCache,
} from "../../api/screenCache";
import type { MarketplaceFoodItem } from "../../types/models";
import { colors } from "../../ui/theme";
import { useAuth } from "../auth/AuthContext";
import type { GiveawayOwner } from "./MarketplaceMap.types";
import MarketplaceMapView from "./MarketplaceMapView";

type MarketplaceTab = "available" | "claimed";

export default function MarketplaceScreen({
  view = "available",
}: {
  view?: MarketplaceTab;
}) {
  const { user } = useAuth();
  const tab = view;
  const initialItems = peekScreenCache(
    tab === "available" ? "marketplaceAvailable" : "marketplaceClaimed",
  );
  const [items, setItems] = useState<MarketplaceFoodItem[]>(initialItems ?? []);
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(!initialItems);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [collectingIds, setCollectingIds] = useState<Set<number>>(new Set());

  const collect = useCallback(async (item: MarketplaceFoodItem) => {
    const availableBefore = peekScreenCache("marketplaceAvailable") ?? [];
    const claimedBefore = peekScreenCache("marketplaceClaimed") ?? [];
    const optimistic = { ...item, claimedAt: new Date().toISOString() };

    updateScreenCache(
      "marketplaceAvailable",
      availableBefore.filter((available) => available.id !== item.id),
    );
    updateScreenCache("marketplaceClaimed", [
      optimistic,
      ...claimedBefore.filter((claimed) => claimed.id !== item.id),
    ]);
    setCollectingIds((current) => new Set(current).add(item.id));

    try {
      const confirmed = await claimMarketplaceFood(item.id);
      updateScreenCache("marketplaceClaimed", [
        confirmed,
        ...(peekScreenCache("marketplaceClaimed") ?? []).filter(
          (claimed) => claimed.id !== item.id,
        ),
      ]);
    } catch {
      updateScreenCache("marketplaceAvailable", availableBefore);
      updateScreenCache("marketplaceClaimed", claimedBefore);
      Alert.alert("Unable to collect", "Please try again.");
    } finally {
      setCollectingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }, []);

  const loadListings = useCallback(
    async (showRefresh = false) => {
      const cacheKey =
        tab === "available" ? "marketplaceAvailable" : "marketplaceClaimed";
      const cached = peekScreenCache(cacheKey);
      if (cached) setItems(cached);
      if (showRefresh) setRefreshing(true);
      else if (!cached) setLoading(true);
      setError("");
      try {
        setItems(
          await loadScreenCache(
            cacheKey,
            tab === "available"
              ? getMarketplaceFoods
              : getClaimedMarketplaceFoods,
            true,
          ),
        );
      } catch {
        if (!cached) {
          setError("We couldn't load nearby giveaways right now.");
        }
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

  useEffect(() => {
    const cacheKey =
      tab === "available" ? "marketplaceAvailable" : "marketplaceClaimed";
    return subscribeScreenCache(cacheKey, () => {
      const cached = peekScreenCache(cacheKey);
      if (cached) setItems(cached);
    });
  }, [tab]);

  if (tab === "claimed") {
    return (
      <View style={styles.screen}>
        <View style={styles.claimedTopSpacer} />
        {!loading && !error && items.length > 0 ? (
          <View style={styles.collectionCountRow}>
            <Text style={styles.collectionCount}>YOUR COLLECTIONS</Text>
            <Text style={styles.collectionTotal}>{items.length} items</Text>
          </View>
        ) : null}
        <ScrollView
          contentContainerStyle={styles.claimedContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadListings(true)}
            />
          }
        >
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
                Food you collect from neighbours will appear here.
              </Text>
            </View>
          ) : null}
          {!loading && !error
            ? items.map((item) => (
                <ClaimedRow key={item.id} item={item} />
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

      {error ? (
        <View style={styles.errorOverlay}>
          <ErrorCard message={error} onRetry={() => void loadListings()} />
        </View>
      ) : null}

      {!loading && !error && selectedOwner ? (
        <View style={styles.sheet}>
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
                  <View style={styles.ownerMetaRow}>
                    <View style={styles.ownerMetaItem}>
                      <Ionicons color={colors.textMuted} name="location-outline" size={13} />
                      <Text style={styles.ownerMetaText}>
                        {selectedOwner.distanceKm == null
                          ? "Nearby"
                          : `${selectedOwner.distanceKm.toFixed(1)} km away`}
                      </Text>
                    </View>
                    <View style={styles.ownerMetaItem}>
                      <Ionicons color={colors.accent} name="gift-outline" size={13} />
                      <Text style={styles.ownerMetaText}>
                        {selectedOwner.items.length} item{selectedOwner.items.length === 1 ? "" : "s"}
                      </Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  accessibilityLabel="Close listings"
                  onPress={() => setSelectedOwnerId(null)}
                  style={styles.closeButton}
                >
                  <Ionicons color={colors.textMuted} name="close" size={20} />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.foodRail}>
                {selectedOwner.items.map((item) => (
                  <GiveawayCard
                    key={item.id}
                    item={item}
                    collecting={collectingIds.has(item.id)}
                    onCollect={() => void collect(item)}
                  />
                ))}
                </View>
              </ScrollView>
          </>
        </View>
      ) : null}
      {!loading && !error && owners.length === 0 ? (
        <View style={styles.mapEmpty}>
          <Text style={styles.mapEmptyTitle}>No food nearby yet</Text>
          <Text style={styles.mapEmptyText}>New listings will appear here.</Text>
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

function GiveawayCard({
  collecting,
  item,
  onCollect,
}: {
  collecting: boolean;
  item: MarketplaceFoodItem;
  onCollect: () => void;
}) {
  return (
    <View style={styles.giveawayCard}>
      <View style={styles.giveawayIcon}>
        <Ionicons color={colors.accent} name="gift-outline" size={20} />
      </View>
      <View style={styles.giveawayCopy}>
        <View style={styles.giveawayNameLine}>
          <Text numberOfLines={1} style={styles.giveawayName}>
            {item.name}
          </Text>
          {item.quantity ? (
            <Text numberOfLines={1} style={styles.giveawayQuantity}>
              {item.quantity}
            </Text>
          ) : null}
        </View>
        <Text style={styles.giveawayDate}>{listedLabel(item.createdAt)}</Text>
      </View>
      <Pressable
        accessibilityLabel={`Collect ${item.name}`}
        disabled={collecting}
        onPress={onCollect}
        style={({ pressed }) => [
          styles.collectButton,
          (pressed || collecting) && styles.pressed,
        ]}
      >
        {collecting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.collectButtonText}>Collect</Text>
        )}
      </Pressable>
    </View>
  );
}

function ClaimedRow({ item }: { item: MarketplaceFoodItem }) {
  return (
    <View style={styles.claimedRow}>
      <View style={styles.claimedIcon}>
        <Ionicons color="#506AA8" name="bag-check-outline" size={20} />
      </View>
      <View style={styles.claimedRowCopy}>
        <View style={styles.claimedNameLine}>
          <Text numberOfLines={1} style={styles.claimedName}>
            {item.name}
          </Text>
          {item.quantity ? (
            <Text numberOfLines={1} style={styles.claimedQuantity}>
              {item.quantity}
            </Text>
          ) : null}
        </View>
        <Text style={styles.claimedDate}>
          {collectedLabel(item.claimedAt ?? item.createdAt)}
        </Text>
      </View>
      <Text numberOfLines={1} style={styles.claimedOwner}>
        {item.ownerName}
      </Text>
    </View>
  );
}

function listedLabel(createdAt: string) {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return "Listed recently";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Listed just now";
  if (minutes < 60) return `Listed ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Listed ${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Listed ${days} day${days === 1 ? "" : "s"} ago`;
  return `Listed ${new Date(createdAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })}`;
}

function collectedLabel(claimedAt: string) {
  return listedLabel(claimedAt).replace("Listed", "Collected");
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
    borderColor: colors.surfaceHigh,
    borderRadius: 24,
    borderWidth: 1,
    bottom: 104,
    elevation: 14,
    left: 14,
    maxHeight: 310,
    paddingBottom: 14,
    paddingTop: 16,
    position: "absolute",
    right: 14,
    shadowColor: "#173124",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
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
  ownerMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 13,
    marginTop: 4,
  },
  ownerMetaItem: { alignItems: "center", flexDirection: "row", gap: 4 },
  ownerMetaText: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceLow,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  foodRail: { gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  giveawayCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceLow,
    borderColor: colors.surfaceHigh,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    padding: 12,
    width: "100%",
  },
  giveawayIcon: {
    alignItems: "center",
    backgroundColor: "#F8E6D8",
    borderRadius: 13,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  giveawayCopy: {
    flex: 1,
    justifyContent: "center",
  },
  giveawayNameLine: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 7,
  },
  giveawayName: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    flexShrink: 1,
  },
  giveawayQuantity: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    fontStyle: "italic",
    flexShrink: 1,
  },
  giveawayDate: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 5,
  },
  collectButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    minWidth: 66,
    paddingHorizontal: 10,
  },
  collectButtonText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  pressed: { opacity: 0.72 },
  mapEmpty: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderColor: colors.surfaceHigh,
    borderRadius: 18,
    borderWidth: 1,
    bottom: 96,
    paddingHorizontal: 22,
    paddingVertical: 14,
    position: "absolute",
  },
  mapEmptyTitle: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  mapEmptyText: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  claimedContent: { paddingBottom: 42, paddingTop: 4 },
  claimedTopSpacer: { height: 224 },
  collectionCountRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingBottom: 10,
    paddingTop: 10,
  },
  collectionCount: {
    color: colors.secondary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
  },
  collectionTotal: {
    color: colors.textMuted,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  loader: { marginTop: 38 },
  claimedRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.surfaceHigh,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
    marginHorizontal: 20,
    minHeight: 76,
    padding: 12,
  },
  claimedIcon: {
    alignItems: "center",
    backgroundColor: "#E8EDF8",
    borderRadius: 13,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  claimedRowCopy: { flex: 1, gap: 5 },
  claimedNameLine: { alignItems: "baseline", flexDirection: "row", gap: 7 },
  claimedName: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  claimedQuantity: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    fontStyle: "italic",
    flexShrink: 1,
  },
  claimedDate: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  claimedOwner: {
    color: "#506AA8",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    maxWidth: 76,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginHorizontal: 20,
    borderColor: colors.surfaceHigh,
    borderWidth: 1,
    marginTop: 24,
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
