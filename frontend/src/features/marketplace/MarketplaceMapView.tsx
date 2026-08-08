import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../ui/theme";
import type { MarketplaceMapProps } from "./MarketplaceMap.types";

export default function MarketplaceMapView({ owners, selectedOwnerId, onSelectOwner }: MarketplaceMapProps) {
  return (
    <View style={styles.map}>
      <View style={[styles.road, styles.roadOne]} />
      <View style={[styles.road, styles.roadTwo]} />
      <View style={[styles.park]} />
      {owners.slice(0, 8).map((owner, index) => (
        <Pressable
          key={owner.ownerId}
          onPress={() => onSelectOwner(owner.ownerId)}
          style={[
            styles.marker,
            markerPositions[index % markerPositions.length],
            selectedOwnerId === owner.ownerId && styles.markerSelected,
          ]}
        >
          <Text style={styles.markerText}>{owner.ownerName.charAt(0).toUpperCase()}</Text>
          <View style={styles.count}><Text style={styles.countText}>{owner.items.length}</Text></View>
        </Pressable>
      ))}
      <Text style={styles.webNote}>Open in Expo Go for the interactive neighbourhood map</Text>
    </View>
  );
}

const markerPositions = [
  { left: "18%", top: "26%" },
  { right: "20%", top: "18%" },
  { left: "42%", top: "48%" },
  { right: "12%", top: "60%" },
  { left: "14%", top: "68%" },
] as const;

const styles = StyleSheet.create({
  map: { ...StyleSheet.absoluteFillObject, backgroundColor: "#E9EEE4", overflow: "hidden" },
  road: { backgroundColor: "#FFFFFF", height: 34, position: "absolute", width: "140%" },
  roadOne: { left: "-18%", top: "33%", transform: [{ rotate: "19deg" }] },
  roadTwo: { left: "-20%", top: "62%", transform: [{ rotate: "-13deg" }] },
  park: { backgroundColor: "#D3E5D0", borderRadius: 80, height: 180, position: "absolute", right: -34, top: 70, width: 180 },
  marker: { alignItems: "center", backgroundColor: colors.primary, borderColor: "#FFFFFF", borderRadius: 24, borderWidth: 3, height: 48, justifyContent: "center", position: "absolute", width: 48 },
  markerSelected: { backgroundColor: colors.accent, transform: [{ scale: 1.1 }] },
  markerText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 18 },
  count: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 9, height: 18, justifyContent: "center", position: "absolute", right: -4, top: -4, width: 18 },
  countText: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 9 },
  webNote: { alignSelf: "center", backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 12, bottom: 120, color: colors.textMuted, fontSize: 12, paddingHorizontal: 14, paddingVertical: 9, position: "absolute" },
});
