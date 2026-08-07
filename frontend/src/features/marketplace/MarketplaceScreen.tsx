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

const MINIMAL_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#F7F5F0" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8A867D" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#F7F5F0" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#EEEAE1" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#E7E3DB" }] },
];

function FoodPin({ item, onImageLoad }: { item: MarketplaceFoodItem; onImageLoad: () => void }) {
  return (
    <View collapsable={false} style={styles.pin}>
      {item.imageUrl ? (
        <Image
          onLoad={onImageLoad}
          resizeMode="cover"
          source={{ uri: item.imageUrl }}
          style={styles.pinImage}
        />
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
  const [loadedPinImages, setLoadedPinImages] = useState<Set<number>>(() => new Set());

  const markPinImageLoaded = useCallback((id: number) => {
    setLoadedPinImages((current) => {
      if (current.has(id)) return current;
      return new Set(current).add(id);
    });
  }, []);

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
        customMapStyle={MINIMAL_MAP_STYLE}
        mapType="standard"
        pitchEnabled={false}
        rotateEnabled={false}
        showsBuildings={false}
        showsCompass={false}
        showsIndoorLevelPicker={false}
        showsPointsOfInterest={false}
        showsScale={false}
        showsTraffic={false}
        showsUserLocation
        toolbarEnabled={false}
      >
        {items.map((item) => (
          <Marker
            key={item.id}
            coordinate={{ latitude: item.latitude, longitude: item.longitude }}
            onPress={() => setSelected(item)}
            tracksViewChanges={Boolean(item.imageUrl) && !loadedPinImages.has(item.id)}
          >
            <FoodPin item={item} onImageLoad={() => markPinImageLoaded(item.id)} />
          </Marker>
        ))}
      </MapView>

      <View style={styles.header}>
        <View style={styles.headerDot} />
        <Text style={styles.title}>Nearby food</Text>
        <Text style={styles.count}>{items.length}</Text>
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
          {selected.imageUrl ? <Image resizeMode="cover" source={{ uri: selected.imageUrl }} style={styles.cardImage} /> : <View style={styles.cardFallback}><Text style={styles.cardEmoji}>🍲</Text></View>}
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
  header: { position: "absolute", top: 16, left: 16, alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(255, 253, 249, 0.96)", borderRadius: 24, flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 11, shadowColor: "#4B4037", shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  headerDot: { backgroundColor: "#748153", borderRadius: 5, height: 10, width: 10 },
  title: { color: "#3F4431", fontSize: 16, fontWeight: "800" },
  count: { backgroundColor: "#E8E1F1", borderRadius: 12, color: "#5A5366", fontSize: 12, fontWeight: "800", overflow: "hidden", paddingHorizontal: 7, paddingVertical: 2 },
  pin: { width: 54, height: 54, borderRadius: 27, overflow: "hidden", backgroundColor: "#D8D0EA", borderWidth: 3, borderColor: "#FFFCF5", alignItems: "center", justifyContent: "center", shadowColor: "#37322D", shadowOpacity: 0.25, shadowRadius: 5, elevation: 5 },
  pinImage: { width: "100%", height: "100%" },
  pinEmoji: { fontSize: 27 },
  status: { position: "absolute", top: 75, alignSelf: "center", backgroundColor: "#FFFCF5", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 11, maxWidth: "88%" },
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
