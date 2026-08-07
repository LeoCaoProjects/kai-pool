import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { useFocusEffect } from "expo-router";

import { getMarketplaceFoods } from "../../api/marketplace";
import { useAuth } from "../auth/AuthContext";
import type { MarketplaceFoodItem } from "../../types/models";

const DEFAULT_REGION: Region = {
  latitude: -36.991,
  longitude: 174.861,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};

const availabilityLabel = {
  PRIVATE: "Private",
  COOK_TOGETHER: "Cook together",
  GIVEAWAY: "Giveaway",
} as const;

function FoodPin({ item }: { item: MarketplaceFoodItem }) {
  return (
    <View style={styles.pin}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.pinImage} />
      ) : (
        <Text style={styles.pinEmoji}>🍲</Text>
      )}
    </View>
  );
}

export default function MarketplaceScreen() {
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);
  const [items, setItems] = useState<MarketplaceFoodItem[]>([]);
  const [selected, setSelected] = useState<MarketplaceFoodItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const listings = await getMarketplaceFoods();
      setItems(listings);
      if (!user?.latitude && listings[0]) {
        mapRef.current?.animateToRegion({
          ...DEFAULT_REGION,
          latitude: listings[0].latitude,
          longitude: listings[0].longitude,
        }, 350);
      }
    } catch {
      setError("We couldn't load nearby food right now.");
    } finally {
      setLoading(false);
    }
  }, [user?.latitude]);

  useFocusEffect(useCallback(() => {
    void loadListings();
  }, [loadListings]));

  const initialRegion = useMemo(() => {
    if (user?.latitude == null || user.longitude == null) return DEFAULT_REGION;
    return { ...DEFAULT_REGION, latitude: user.latitude, longitude: user.longitude };
  }, [user?.latitude, user?.longitude]);

  return (
    <View style={styles.screen}>
      <MapView
        initialRegion={initialRegion}
        ref={mapRef}
        onPress={() => setSelected(null)}
        style={StyleSheet.absoluteFill}
        showsCompass={false}
        showsUserLocation
      >
        {items.map((item) => (
          <Marker
            key={item.id}
            coordinate={{ latitude: item.latitude, longitude: item.longitude }}
            onPress={() => setSelected(item)}
          >
            <FoodPin item={item} />
          </Marker>
        ))}
      </MapView>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>KAI POOL MAP</Text>
        <Text style={styles.title}>Food near you</Text>
        <Text style={styles.subtitle}>Move the map to explore community listings.</Text>
      </View>

      {loading ? <View style={styles.status}><ActivityIndicator color="#66734D" /></View> : null}
      {error ? <Pressable onPress={loadListings} style={styles.status}><Text>{error} Tap to retry.</Text></Pressable> : null}
      {!loading && !error && !items.length ? (
        <View style={styles.status}><Text style={styles.emptyText}>No nearby listings yet. Add a profile location to appear here.</Text></View>
      ) : null}

      {selected ? (
        <View style={styles.card}>
          <Pressable accessibilityLabel="Close listing details" onPress={() => setSelected(null)} style={styles.close}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
          {selected.imageUrl ? <Image source={{ uri: selected.imageUrl }} style={styles.cardImage} /> : <View style={styles.cardFallback}><Text style={styles.cardEmoji}>🍲</Text></View>}
          <View style={styles.cardContent}>
            <Text style={styles.availability}>{availabilityLabel[selected.availability]}</Text>
            <Text style={styles.foodName}>{selected.name}</Text>
            <Text style={styles.meta}>{selected.quantity} · Shared by {selected.ownerName}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F0E4" },
  header: { position: "absolute", top: 16, left: 16, right: 16, backgroundColor: "rgba(255, 252, 245, 0.94)", borderRadius: 20, padding: 16, shadowColor: "#4B4037", shadowOpacity: 0.13, shadowRadius: 12, elevation: 4 },
  eyebrow: { color: "#68734E", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: "#3F4431", fontSize: 26, fontWeight: "800", marginTop: 2 },
  subtitle: { color: "#706961", fontSize: 13, marginTop: 3 },
  pin: { width: 54, height: 54, borderRadius: 27, overflow: "hidden", backgroundColor: "#D8D0EA", borderWidth: 3, borderColor: "#FFFCF5", alignItems: "center", justifyContent: "center", shadowColor: "#37322D", shadowOpacity: 0.25, shadowRadius: 5, elevation: 5 },
  pinImage: { width: "100%", height: "100%" },
  pinEmoji: { fontSize: 27 },
  status: { position: "absolute", top: 145, alignSelf: "center", backgroundColor: "#FFFCF5", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 11, maxWidth: "88%" },
  emptyText: { color: "#5F654B", textAlign: "center" },
  card: { position: "absolute", left: 16, right: 16, bottom: 24, minHeight: 128, flexDirection: "row", overflow: "hidden", borderRadius: 22, backgroundColor: "#FFFCF5", shadowColor: "#39342F", shadowOpacity: 0.2, shadowRadius: 14, elevation: 8 },
  cardImage: { width: 124, minHeight: 128 },
  cardFallback: { width: 124, minHeight: 128, backgroundColor: "#DCD4EC", alignItems: "center", justifyContent: "center" },
  cardEmoji: { fontSize: 46 },
  cardContent: { flex: 1, justifyContent: "center", padding: 16, paddingRight: 30 },
  availability: { color: "#69764E", fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  foodName: { color: "#35372D", fontSize: 22, fontWeight: "800", marginTop: 3 },
  meta: { color: "#706961", fontSize: 13, marginTop: 5, lineHeight: 18 },
  close: { position: "absolute", zIndex: 1, right: 10, top: 8, width: 25, height: 25, borderRadius: 13, backgroundColor: "#E6D7CB", alignItems: "center", justifyContent: "center" },
  closeText: { color: "#564E48", fontSize: 22, lineHeight: 24 },
});
