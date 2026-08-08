import { useEffect, useState } from "react";
import { Image, ImageBackground, StyleSheet, Text, View } from "react-native";

import { buildApiUrl } from "../../config/api";
import type { FoodContribution } from "../../types/models";

type HeroMeal = {
  mealName: string;
  description: string;
  culturalOrigin: string;
  imageUrl: string | null;
  imageAttribution: string | null;
};

const resolveImageUrl = (imageUrl: string | null): string | null => {
  if (!imageUrl) {
    return null;
  }
  return imageUrl.startsWith("/") ? buildApiUrl(imageUrl) : imageUrl;
};

export function MealHero({
  meal,
  rank,
  score,
  distanceKm,
  compact = false,
}: {
  meal: HeroMeal;
  rank?: number;
  score?: number;
  distanceKm?: number;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const imageUrl = resolveImageUrl(meal.imageUrl);

  useEffect(() => setFailed(false), [imageUrl]);

  const content = (
    <>
      <View style={styles.heroShade} />
      {rank !== undefined || score !== undefined || distanceKm !== undefined ? (
        <View style={styles.badgeRow}>
          {rank !== undefined ? (
            <Text style={styles.rankBadge}>#{rank} nearby match</Text>
          ) : null}
          <View style={styles.badgeSpacer} />
          {score !== undefined ? (
            <Text style={styles.scoreBadge}>{score}% match</Text>
          ) : null}
          {distanceKm !== undefined ? (
            <Text style={styles.distanceBadge}>{distanceKm.toFixed(1)} km</Text>
          ) : null}
        </View>
      ) : null}
      <View style={styles.heroCopy}>
        <Text style={[styles.heroTitle, compact && styles.compactHeroTitle]}>
          {meal.mealName}
        </Text>
        <Text style={styles.heroCulture}>{meal.culturalOrigin}</Text>
      </View>
    </>
  );

  return (
    <View>
      {imageUrl && !failed ? (
        <ImageBackground
          accessibilityLabel={`${meal.mealName} representative meal image`}
          source={{ uri: imageUrl }}
          style={[styles.hero, compact && styles.compactHero]}
          imageStyle={styles.heroImage}
          onError={() => setFailed(true)}
        >
          {content}
        </ImageBackground>
      ) : (
        <View
          style={[
            styles.hero,
            styles.heroFallback,
            compact && styles.compactHero,
          ]}
        >
          {content}
        </View>
      )}
      {meal.imageAttribution ? (
        <Text style={styles.attribution}>{meal.imageAttribution}</Text>
      ) : null}
    </View>
  );
}

export function PersonSummary({
  name,
  bio,
  profileImageUrl,
  cultures,
}: {
  name: string;
  bio: string | null;
  profileImageUrl: string | null;
  cultures: string[];
}) {
  return (
    <View style={styles.personRow}>
      {profileImageUrl ? (
        <Image source={{ uri: profileImageUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.personCopy}>
        <Text style={styles.personEyebrow}>Cook with</Text>
        <Text style={styles.personName}>{name}</Text>
        {bio ? (
          <Text style={styles.bio} numberOfLines={2}>
            {bio}
          </Text>
        ) : null}
        {cultures.length > 0 ? (
          <Text style={styles.cultures}>Enjoys {cultures.join(" · ")}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function ContributionPanel({
  title,
  foods,
  tone,
}: {
  title: string;
  foods: FoodContribution[];
  tone: "you" | "them";
}) {
  return (
    <View
      style={[
        styles.contributionPanel,
        tone === "you" ? styles.yourPanel : styles.theirPanel,
      ]}
    >
      <Text style={styles.contributionTitle}>{title}</Text>
      {foods.map((food) => (
        <View key={food.foodId} style={styles.ingredientRow}>
          {food.imageUrl ? (
            <Image
              source={{ uri: food.imageUrl }}
              style={styles.ingredientImage}
            />
          ) : (
            <View
              style={[
                styles.ingredientDot,
                tone === "you" ? styles.yourDot : styles.theirDot,
              ]}
            />
          )}
          <Text style={styles.ingredientText} numberOfLines={2}>
            {food.name}
            {food.quantity ? ` · ${food.quantity}` : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 238,
    justifyContent: "space-between",
    overflow: "hidden",
    padding: 14,
    backgroundColor: "#285943",
  },
  compactHero: { height: 190 },
  heroImage: { resizeMode: "cover" },
  heroFallback: { backgroundColor: "#285943" },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 24, 16, 0.30)",
  },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  badgeSpacer: { flex: 1 },
  rankBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#fff7df",
    color: "#704c00",
    fontSize: 12,
    fontWeight: "800",
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#CEE5DA",
    color: "#185b35",
    fontSize: 12,
    fontWeight: "800",
  },
  distanceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.92)",
    color: "#24332b",
    fontSize: 12,
    fontWeight: "700",
  },
  heroCopy: { gap: 4 },
  heroTitle: {
    color: "white",
    fontSize: 27,
    lineHeight: 31,
    fontWeight: "900",
  },
  compactHeroTitle: { fontSize: 23, lineHeight: 27 },
  heroCulture: { color: "#f2ead6", fontSize: 14, fontWeight: "600" },
  attribution: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    color: "#718096",
    fontSize: 10,
  },
  personRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  avatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d8f5df",
  },
  avatarInitial: {
    color: "#173124",
    fontFamily: "Inter_600SemiBold",
    fontSize: 22,
  },
  personCopy: { flex: 1, gap: 1 },
  personEyebrow: {
    color: "#4E635A",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  personName: {
    color: "#173124",
    fontFamily: "Inter_600SemiBold",
    fontSize: 19,
  },
  bio: {
    color: "#424844",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  cultures: {
    marginTop: 2,
    color: "#4E635A",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  contributionPanel: {
    flex: 1,
    minWidth: 0,
    gap: 8,
    padding: 12,
    borderRadius: 14,
  },
  yourPanel: { backgroundColor: "#eef8f0" },
  theirPanel: { backgroundColor: "#fff4e5" },
  contributionTitle: { color: "#24332b", fontSize: 13, fontWeight: "900" },
  ingredientRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  ingredientImage: { width: 27, height: 27, borderRadius: 7 },
  ingredientDot: { width: 9, height: 9, borderRadius: 5 },
  yourDot: { backgroundColor: "#3c9a61" },
  theirDot: { backgroundColor: "#dd8a27" },
  ingredientText: { flex: 1, color: "#46564e", fontSize: 12, lineHeight: 16 },
});
