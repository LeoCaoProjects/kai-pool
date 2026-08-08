import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { claimMarketplaceFood, getMarketplaceFood } from "../../api/marketplace";
import { ApiError } from "../../api/client";
import type { MarketplaceFoodItem } from "../../types/models";

export default function MarketplaceDetailsScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const router = useRouter();
  const id = Number(listingId);
  const [listing, setListing] = useState<MarketplaceFoodItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) {
      setError("This listing link is invalid.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setListing(await getMarketplaceFood(id));
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 404
        ? "This giveaway is no longer available."
        : "We couldn't load this listing.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const claim = async () => {
    setClaiming(true);
    try {
      const claimed = await claimMarketplaceFood(id);
      setListing(claimed);
      Alert.alert("Food collected", "This giveaway is now saved under My collections.");
    } catch (caught) {
      const message = caught instanceof ApiError
        ? caught.message
        : "We couldn't collect this food. Please try again.";
      Alert.alert("Unable to collect", message);
      if (caught instanceof ApiError && (caught.status === 404 || caught.status === 409)) {
        setListing(null);
        setError("This giveaway is no longer available.");
      }
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#173124" size="large" /></View>;
  }

  if (!listing) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Listing unavailable</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => router.replace("/(tabs)/marketplace")} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Back to marketplace</Text>
        </Pressable>
      </View>
    );
  }

  const isCollected = listing.claimedAt != null;
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      {listing.imageUrl ? (
        <Image resizeMode="cover" source={{ uri: listing.imageUrl }} style={styles.hero} />
      ) : (
        <View style={[styles.hero, styles.heroFallback]}><Text style={styles.heroText}>{listing.name.charAt(0).toUpperCase()}</Text></View>
      )}
      <View style={styles.body}>
        <Text style={styles.eyebrow}>{isCollected ? "YOUR COLLECTION" : "AVAILABLE IN KAI POOL"}</Text>
        <Text style={styles.title}>{listing.name}</Text>
        <Text style={styles.quantity}>{listing.quantity || "Quantity not specified"}</Text>

        <View style={styles.detailsCard}>
          <Text style={styles.detailLabel}>Shared by</Text>
          <Text style={styles.detailValue}>{listing.ownerName}</Text>
          <View style={styles.divider} />
          <Text style={styles.detailLabel}>Approximate distance</Text>
          <Text style={styles.detailValue}>
            {listing.distanceKm == null ? "Unavailable" : `${listing.distanceKm.toFixed(1)} km away`}
          </Text>
          <View style={styles.divider} />
          <Text style={styles.detailLabel}>Listed</Text>
          <Text style={styles.detailValue}>{new Date(listing.createdAt).toLocaleDateString()}</Text>
        </View>

        {isCollected ? (
          <View style={styles.claimedNotice}>
            <Text style={styles.claimedTitle}>Collection confirmed</Text>
            <Text style={styles.claimedText}>This food is unavailable to everyone else and saved in My collections.</Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={claiming}
            onPress={() => void claim()}
            style={({ pressed }) => [styles.claimButton, (pressed || claiming) && styles.buttonPressed]}
          >
            {claiming ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.claimButtonText}>Collect this food</Text>}
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FDF9F0" },
  content: { paddingBottom: 40 },
  center: { alignItems: "center", backgroundColor: "#FDF9F0", flex: 1, justifyContent: "center", padding: 28 },
  hero: { backgroundColor: "#DDE7D9", height: 280, width: "100%" },
  heroFallback: { alignItems: "center", justifyContent: "center" },
  heroText: { color: "#4E635A", fontFamily: "Inter_600SemiBold", fontSize: 72 },
  body: { padding: 20 },
  eyebrow: { color: "#4E635A", fontSize: 12, fontWeight: "600", letterSpacing: 1.1 },
  title: { color: "#173124", fontSize: 28, fontWeight: "600", marginTop: 7 },
  quantity: { color: "#526158", fontSize: 17, marginTop: 7 },
  detailsCard: { backgroundColor: "#FFFFFF", borderRadius: 18, marginTop: 22, padding: 18 },
  detailLabel: { color: "#778079", fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  detailValue: { color: "#263C31", fontSize: 17, fontWeight: "700", marginTop: 4 },
  divider: { backgroundColor: "#E8E8E2", height: 1, marginVertical: 14 },
  claimButton: { alignItems: "center", backgroundColor: "#D17B47", borderRadius: 12, marginTop: 22, minHeight: 56, justifyContent: "center", padding: 15 },
  claimButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  buttonPressed: { opacity: 0.72 },
  claimedNotice: { backgroundColor: "#DCEFE2", borderRadius: 16, marginTop: 22, padding: 18 },
  claimedTitle: { color: "#1E603B", fontSize: 17, fontWeight: "800" },
  claimedText: { color: "#41634F", lineHeight: 20, marginTop: 5 },
  errorTitle: { color: "#273C32", fontSize: 23, fontWeight: "900", textAlign: "center" },
  errorText: { color: "#68736C", lineHeight: 21, marginTop: 8, textAlign: "center" },
  secondaryButton: { borderColor: "#173124", borderRadius: 12, borderWidth: 1, marginTop: 22, paddingHorizontal: 18, paddingVertical: 13 },
  secondaryButtonText: { color: "#173124", fontWeight: "600" },
});
