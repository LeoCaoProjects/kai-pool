import { useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import Ionicons from "@expo/vector-icons/Ionicons";

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
  const markerScale = useRef(new Animated.Value(1)).current;
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchMoved = useRef(false);
  const markerPressed = useRef(false);
  const zoomGuardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guardedTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const centering = useRef(false);
  const brieflyDisableZoom = (point: { x: number; y: number }) => {
    if (zoomGuardTimer.current) clearTimeout(zoomGuardTimer.current);
    guardedTap.current = { ...point, time: Date.now() };
    mapRef.current?.setNativeProps({ scrollEnabled: true, zoomEnabled: false });
    zoomGuardTimer.current = setTimeout(() => {
      mapRef.current?.setNativeProps({ scrollEnabled: true, zoomEnabled: true });
      zoomGuardTimer.current = null;
    }, 100);
  };
  const calculatedInitialRegion = useMemo<Region>(
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
  const initialRegion = useRef(calculatedInitialRegion).current;

  return (
    <MapView
      ref={mapRef}
      customMapStyle={softMapStyle as never}
      initialRegion={initialRegion}
      loadingBackgroundColor={colors.background}
      loadingEnabled={false}
      loadingIndicatorColor={colors.primary}
      moveOnMarkerPress={false}
      onTouchEnd={() => {
        const tapPoint = touchStart.current;
        const wasTap = touchStart.current != null && !touchMoved.current;
        touchStart.current = null;
        touchMoved.current = false;
        if (!wasTap || !tapPoint) return;
        setTimeout(() => {
          if (!markerPressed.current) {
            const previousTap = guardedTap.current;
            if (
              previousTap &&
              Date.now() - previousTap.time < 320 &&
              Math.hypot(tapPoint.x - previousTap.x, tapPoint.y - previousTap.y) < 36
            ) {
              if (zoomGuardTimer.current) clearTimeout(zoomGuardTimer.current);
              zoomGuardTimer.current = null;
              guardedTap.current = null;
              mapRef.current?.setNativeProps({ scrollEnabled: true, zoomEnabled: true });
              setTimeout(() => {
                void mapRef.current?.getCamera().then((camera) => {
                  if (!camera) return;
                  mapRef.current?.animateCamera(
                    {
                      ...camera,
                      zoom: (camera.zoom ?? 12) + 1,
                    },
                    { duration: 220 },
                  );
                });
              }, 16);
              return;
            }
            centering.current = false;
            onSelectOwner(null);
            brieflyDisableZoom(tapPoint);
          }
        }, 0);
      }}
      onTouchMove={(event) => {
        const start = touchStart.current;
        if (!start) return;
        const { pageX, pageY } = event.nativeEvent;
        if (Math.hypot(pageX - start.x, pageY - start.y) > 7) {
          touchMoved.current = true;
        }
      }}
      onTouchStart={(event) => {
        if (centering.current) {
          centering.current = false;
          void mapRef.current?.getCamera().then((camera) => {
            mapRef.current?.setCamera(camera);
          });
        }
        const { pageX, pageY } = event.nativeEvent;
        touchStart.current = { x: pageX, y: pageY };
        touchMoved.current = false;
        markerPressed.current = false;
      }}
      onRegionChange={(region) => {
        const nextScale = Math.max(
          0.42,
          Math.min(1, 1 - Math.log10(Math.max(region.latitudeDelta / 0.16, 1)) * 0.3),
        );
        markerScale.setValue(nextScale);
      }}
      rotateEnabled={false}
      scrollEnabled
      style={StyleSheet.absoluteFill}
      toolbarEnabled={false}
      zoomTapEnabled={false}
    >
      {viewerCoordinate ? (
        <Marker
          coordinate={viewerCoordinate}
          tracksViewChanges
        >
          <Animated.View style={[styles.youHalo, { transform: [{ scale: markerScale }] }]}>
            <View style={styles.youDot} />
          </Animated.View>
        </Marker>
      ) : null}
      {owners.map((owner) => {
        const selected = selectedOwnerId === owner.ownerId;
        return (
          <Marker
            anchor={{ x: 0.5, y: 0.5 }}
            key={owner.ownerId}
            coordinate={{
              latitude: owner.latitude,
              longitude: owner.longitude,
            }}
            onPress={(event) => {
              event.stopPropagation();
              markerPressed.current = true;
              centering.current = true;
              mapRef.current?.animateCamera(
                {
                  center: {
                    latitude: owner.latitude,
                    longitude: owner.longitude,
                  },
                },
                { duration: 280 },
              );
              setTimeout(() => {
                centering.current = false;
              }, 300);
              onSelectOwner(owner.ownerId);
              setTimeout(() => {
                markerPressed.current = false;
              }, 0);
            }}
            tracksViewChanges
            zIndex={2}
          >
            <Animated.View
              style={[
                styles.markerShadow,
                selected && styles.markerShadowSelected,
                { transform: [{ scale: markerScale }] },
              ]}
            >
              <View style={[styles.marker, selected && styles.markerSelected]}>
                <Text style={styles.markerInitial}>
                  {owner.ownerName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.count}>
                <Ionicons color="#FFFFFF" name="gift" size={9} />
                <Text style={styles.countText}>{owner.items.length}</Text>
              </View>
            </Animated.View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  markerShadow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.surfaceHigh,
    borderWidth: 1,
    borderRadius: 30,
    padding: 4,
  },
  markerShadowSelected: {
    backgroundColor: "#F8E6D8",
    borderColor: colors.accent,
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
  count: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderColor: "#FFFFFF",
    borderRadius: 11,
    borderWidth: 2,
    flexDirection: "row",
    gap: 2,
    height: 22,
    justifyContent: "center",
    minWidth: 30,
    paddingHorizontal: 5,
    position: "absolute",
    right: -7,
    top: -5,
  },
  countText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },
  youHalo: {
    alignItems: "center",
    backgroundColor: colors.secondaryContainer,
    borderColor: "#FFFFFF",
    borderWidth: 2,
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
