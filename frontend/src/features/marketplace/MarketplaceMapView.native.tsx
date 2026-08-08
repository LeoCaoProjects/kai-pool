import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";

import { colors } from "../../ui/theme";
import type { MarketplaceMapProps } from "./MarketplaceMap.types";

const fallbackRegion: Region = {
  latitude: -36.99,
  longitude: 174.88,
  latitudeDelta: 0.16,
  longitudeDelta: 0.16,
};

const softMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#F2EFE5" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#536158" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#F8F5EC" }] },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#DCE8D8" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#FFFFFF" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#DED9CD" }],
  },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#BFDDE1" }],
  },
] as const;

export default function MarketplaceMapView({
  owners,
  selectedOwnerId,
  viewerCoordinate,
  onSelectOwner,
}: MarketplaceMapProps) {
  const mapRef = useRef<MapView>(null);
  const initialRegion = useMemo<Region>(
    () => ({
      latitude:
        viewerCoordinate?.latitude ??
        owners[0]?.latitude ??
        fallbackRegion.latitude,
      longitude:
        viewerCoordinate?.longitude ??
        owners[0]?.longitude ??
        fallbackRegion.longitude,
      latitudeDelta: fallbackRegion.latitudeDelta,
      longitudeDelta: fallbackRegion.longitudeDelta,
    }),
    [owners, viewerCoordinate],
  );

  useEffect(() => {
    const selected = owners.find((owner) => owner.ownerId === selectedOwnerId);
    if (!selected) return;
    mapRef.current?.animateCamera(
      {
        center: {
          latitude: selected.latitude - 0.012,
          longitude: selected.longitude,
        },
        zoom: 14,
      },
      { duration: 420 },
    );
  }, [owners, selectedOwnerId]);

  return (
    <MapView
      ref={mapRef}
      customMapStyle={softMapStyle as never}
      initialRegion={initialRegion}
      loadingBackgroundColor={colors.background}
      loadingEnabled
      loadingIndicatorColor={colors.primary}
      onPress={() => onSelectOwner(null)}
      rotateEnabled={false}
      style={StyleSheet.absoluteFill}
      toolbarEnabled={false}
    >
      {viewerCoordinate ? (
        <Marker coordinate={viewerCoordinate} tracksViewChanges={false}>
          <View style={styles.youHalo}>
            <View style={styles.youDot} />
          </View>
        </Marker>
      ) : null}
      {owners.map((owner) => {
        const selected = selectedOwnerId === owner.ownerId;
        return (
          <Marker
            key={owner.ownerId}
            coordinate={{
              latitude: owner.latitude,
              longitude: owner.longitude,
            }}
            onPress={(event) => {
              event.stopPropagation();
              onSelectOwner(owner.ownerId);
            }}
            tracksViewChanges
          >
            <View
              style={[
                styles.markerShadow,
                selected && styles.markerShadowSelected,
              ]}
            >
              <View style={[styles.marker, selected && styles.markerSelected]}>
                <Text
                  style={[
                    styles.markerInitial,
                    selected && styles.markerInitialSelected,
                  ]}
                >
                  {owner.ownerName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.count}>
                <Text style={styles.countText}>{owner.items.length}</Text>
              </View>
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  markerShadow: {
    alignItems: "center",
    backgroundColor: "rgba(23,49,36,0.16)",
    borderRadius: 30,
    padding: 4,
  },
  markerShadowSelected: {
    backgroundColor: "rgba(209,123,71,0.22)",
    transform: [{ scale: 1.1 }],
  },
  marker: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 3,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  markerSelected: { backgroundColor: colors.accent },
  markerInitial: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
  },
  markerInitialSelected: { color: "#FFFFFF" },
  count: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: colors.primary,
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    top: -2,
    width: 20,
  },
  countText: {
    color: colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },
  youHalo: {
    alignItems: "center",
    backgroundColor: "rgba(56,132,91,0.2)",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  youDot: {
    backgroundColor: "#38845B",
    borderColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 3,
    height: 16,
    width: 16,
  },
});
