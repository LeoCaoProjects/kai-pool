import { useCallback, useState } from "react";
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

import { getClaimedMarketplaceFoods, getMarketplaceFoods } from "../../api/marketplace";
import type { MarketplaceFoodItem } from "../../types/models";

type MarketplaceTab = "available" | "claimed";

function ListingCard({ item, claimed }: { item: MarketplaceFoodItem; claimed: boolean }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/marketplace/${item.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} resizeMode="cover" style={styles.image} />
      ) : (
        <View style={styles.imageFallback}><Text style={styles.fallbackText}>{item.name.charAt(0).toUpperCase()}</Text></View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardHeading}>
          <Text numberOfLines={1} style={styles.foodName}>{item.name}</Text>
          <View style={[styles.badge, claimed && styles.claimedBadge]}>
            <Text style={[styles.badgeText, claimed && styles.claimedBadgeText]}>
              {claimed ? "Claimed" : "Available"}
            </Text>
          </View>
        </View>
        <Text style={styles.quantity}>{item.quantity || "Quantity not specified"}</Text>
        <Text style={styles.owner}>From {item.ownerName}</Text>
        <Text style={styles.distance}>
          {item.distanceKm == null ? "Distance unavailable" : `About ${item.distanceKm.toFixed(1)} km away`}
        </Text>
      </View>
    </Pressable>
  );
}

export default function MarketplaceScreen() {
  const [tab, setTab] = useState<MarketplaceTab>("available");
  const [items, setItems] = useState<MarketplaceFoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadListings = useCallback(async (showRefresh = false) => {
    showRefresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const listings = tab === "available"
        ? await getMarketplaceFoods()
        : await getClaimedMarketplaceFoods();
      setItems(listings);
    } catch {
      setError("We couldn't load marketplace listings right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useFocusEffect(useCallback(() => {
    void loadListings();
  }, [loadListings]));

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadListings(true)} />}
      style={styles.screen}
    >
      <Text style={styles.eyebrow}>KAI POOL MARKETPLACE</Text>
      <Text style={styles.title}>Share surplus food nearby</Text>
      <Text style={styles.subtitle}>Claim a giveaway before it goes to waste.</Text>

      <View style={styles.tabs}>
        {(["available", "claimed"] as MarketplaceTab[]).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
            onPress={() => setTab(value)}
            style={[styles.tab, tab === value && styles.activeTab]}
          >
            <Text style={[styles.tabText, tab === value && styles.activeTabText]}>
              {value === "available" ? "Nearby giveaways" : "My claims"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? <ActivityIndicator color="#173124" size="large" style={styles.loader} /> : null}
      {error ? (
        <Pressable onPress={() => void loadListings()} style={styles.messageCard}>
          <Text style={styles.error}>{error} Tap to retry.</Text>
        </Pressable>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <View style={styles.messageCard}>
          <Text style={styles.emptyTitle}>{tab === "available" ? "No nearby giveaways" : "Nothing claimed yet"}</Text>
          <Text style={styles.emptyText}>
            {tab === "available"
              ? "Giveaways within 30 km will appear here. Make sure your profile has a location."
              : "Food you claim will stay here so you can find the pickup details."}
          </Text>
        </View>
      ) : null}
      {!loading && !error ? items.map((item) => (
        <ListingCard key={item.id} item={item} claimed={tab === "claimed"} />
      )) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FDF9F0" },
  content: { padding: 18, paddingBottom: 42 },
  eyebrow: { color: "#4E635A", fontSize: 12, fontWeight: "600", letterSpacing: 1.2, marginTop: 6 },
  title: { color: "#173124", fontSize: 28, fontWeight: "600", lineHeight: 36, marginTop: 7 },
  subtitle: { color: "#5C685F", fontSize: 15, lineHeight: 21, marginTop: 6 },
  tabs: { backgroundColor: "#E3E6DC", borderRadius: 14, flexDirection: "row", marginBottom: 18, marginTop: 20, padding: 4 },
  tab: { alignItems: "center", borderRadius: 11, flex: 1, paddingHorizontal: 8, paddingVertical: 10 },
  activeTab: { backgroundColor: "#FFFFFF" },
  tabText: { color: "#647067", fontSize: 13, fontWeight: "700" },
  activeTabText: { color: "#215F3D" },
  loader: { marginTop: 38 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#E6E2D9", borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  cardPressed: { opacity: 0.82 },
  image: { aspectRatio: 4 / 3, backgroundColor: "#E6E2D9", width: "100%" },
  imageFallback: { alignItems: "center", aspectRatio: 4 / 3, backgroundColor: "#E6E2D9", justifyContent: "center", width: "100%" },
  fallbackText: { color: "#4E635A", fontFamily: "Inter_600SemiBold", fontSize: 56 },
  cardBody: { padding: 16 },
  cardHeading: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  foodName: { color: "#1E352A", flex: 1, fontSize: 19, fontWeight: "800" },
  badge: { backgroundColor: "#DCEFE2", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4 },
  badgeText: { color: "#20623E", fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  claimedBadge: { backgroundColor: "#E9E2F1" },
  claimedBadgeText: { color: "#675478" },
  quantity: { color: "#4D5951", fontSize: 14, marginTop: 8 },
  owner: { color: "#6A746E", fontSize: 13, marginTop: 5 },
  distance: { color: "#2D4739", fontSize: 13, fontWeight: "600", marginTop: 5 },
  messageCard: { backgroundColor: "#FFFFFF", borderRadius: 16, marginTop: 16, padding: 22 },
  emptyTitle: { color: "#263B31", fontSize: 18, fontWeight: "800", textAlign: "center" },
  emptyText: { color: "#677169", lineHeight: 21, marginTop: 7, textAlign: "center" },
  error: { color: "#A43E38", lineHeight: 21, textAlign: "center" },
});
