import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ApiError } from "../../api/client";
import {
  getCookingConnections,
  requestCookingConnection,
  respondToCookingConnection,
} from "../../api/connections";
import { getCookingMatches } from "../../api/matches";
import {
  loadScreenCache,
  peekScreenCache,
  updateScreenCache,
} from "../../api/screenCache";
import type { CookingConnection, CookingMatch } from "../../types/models";
import { colors, sharedStyles } from "../../ui/theme";
import { buildApiUrl } from "../../config/api";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../auth/AuthContext";
import { PersonSummary } from "./MatchingComponents";

export type MatchMode = "discover" | "requests" | "connections";

export function MatchesScreen({
  initialMode = "discover",
  modes = ["discover", "requests", "connections"],
  showHeader = true,
}: {
  initialMode?: MatchMode;
  modes?: MatchMode[];
  showHeader?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<MatchMode>(initialMode);
  const cachedMatches = peekScreenCache("matches");
  const cachedConnections = peekScreenCache("connections");
  const [matches, setMatches] = useState<CookingMatch[]>(cachedMatches ?? []);
  const [connections, setConnections] = useState<CookingConnection[]>(
    cachedConnections ?? [],
  );
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(!cachedMatches || !cachedConnections);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async (refresh = false) => {
    const hasVisibleData =
      peekScreenCache("matches") !== undefined &&
      peekScreenCache("connections") !== undefined;
    if (refresh) setRefreshing(true);
    else if (!hasVisibleData) setLoading(true);
    setError("");
    try {
      const [foundMatches, foundConnections] = await Promise.all([
        loadScreenCache("matches", getCookingMatches, true),
        loadScreenCache("connections", getCookingConnections, true),
      ]);
      setMatches(foundMatches);
      setConnections(foundConnections);
    } catch (caught) {
      if (!hasVisibleData) {
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Could not load cooking matches.",
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const pending = useMemo(
    () => connections.filter((item) => item.status === "PENDING"),
    [connections],
  );
  const accepted = useMemo(
    () => connections.filter((item) => item.status === "ACCEPTED"),
    [connections],
  );
  const connectionByUser = useMemo(
    () =>
      new Map(
        connections
          .filter((item) => item.status !== "DECLINED")
          .map((item) => [item.otherUserId, item]),
      ),
    [connections],
  );
  const variedMatches = useMemo(() => diversifyMatches(matches), [matches]);
  const send = async (match: CookingMatch) => {
    setBusyId(match.matchedUserId);
    try {
      const created = await requestCookingConnection(match.matchedUserId);
      setConnections((current) => [
        created,
        ...current.filter((item) => item.id !== created.id),
      ]);
      updateScreenCache("connections", [
        created,
        ...connections.filter((item) => item.id !== created.id),
      ]);
      Alert.alert(
        "Request sent",
        `${match.matchedUserName} can accept or decline your invitation.`,
      );
    } catch (caught) {
      Alert.alert(
        "Could not send request",
        caught instanceof ApiError ? caught.message : "Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  };
  const respond = async (
    connection: CookingConnection,
    status: "ACCEPTED" | "DECLINED",
  ) => {
    setBusyId(connection.id);
    try {
      const updated = await respondToCookingConnection(connection.id, status);
      setConnections((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      updateScreenCache(
        "connections",
        connections.map((item) => (item.id === updated.id ? updated : item)),
      );
      if (status === "ACCEPTED") router.push(`/connection/${updated.id}`);
    } catch (caught) {
      Alert.alert(
        "Could not respond",
        caught instanceof ApiError ? caught.message : "Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  };
  if (loading && showHeader)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loading}>Finding nearby cooks…</Text>
      </View>
    );
  const title =
    mode === "discover"
      ? "Cook Together"
      : mode === "requests"
        ? "Cooking requests"
        : "Your connections";
  const subtitle =
    mode === "discover"
      ? "People nearby whose ingredients work well with yours."
      : mode === "requests"
        ? "Accept an invitation or check requests you’ve sent."
        : "Plan a meal with people you’ve connected with.";
  return (
    <ScrollView
      style={sharedStyles.screen}
      contentContainerStyle={[
        styles.content,
        !showHeader && styles.embeddedContent,
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
        />
      }
    >
      {showHeader ? (
        <View style={styles.header}>
          <Text style={sharedStyles.headline}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      ) : null}
      {modes.length > 1 ? (
        <View style={styles.tabs}>
          {modes.map((value) => (
            <Pressable
              key={value}
              onPress={() => setMode(value)}
              style={[styles.tab, mode === value && styles.activeTab]}
            >
              <Ionicons
                color={mode === value ? "#FFFFFF" : colors.textMuted}
                name={
                  value === "requests"
                    ? "mail-unread-outline"
                    : value === "connections"
                      ? "checkmark-circle-outline"
                      : "compass-outline"
                }
                size={17}
              />
              <Text
                style={[styles.tabText, mode === value && styles.activeTabText]}
              >
                {value === "requests"
                  ? `Requests${pending.length ? ` ${pending.length}` : ""}`
                  : value === "connections"
                    ? `Connected${accepted.length ? ` ${accepted.length}` : ""}`
                    : "Discover"}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {error ? (
        <Pressable onPress={() => void load()} style={sharedStyles.errorBox}>
          <Text style={sharedStyles.errorText}>{error} Tap to retry.</Text>
        </Pressable>
      ) : null}
      {!error && mode === "discover" ? (
        <>
          {loading && variedMatches.length === 0 ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.inlineLoadingText}>Finding nearby cooks</Text>
            </View>
          ) : null}
          {variedMatches.length > 0 ? (
            <View style={styles.listHeading}>
              <Text style={styles.listEyebrow}>NEARBY COOKS</Text>
              <Text style={styles.listCount}>
                {variedMatches.length} match{variedMatches.length === 1 ? "" : "es"}
              </Text>
            </View>
          ) : null}
          {!loading && variedMatches.length === 0 ? (
            <Empty
              text={
                user?.latitude == null
                  ? "Add your approximate location in Profile to discover nearby cooks."
                  : "Mark ingredients as Cook Together to find useful matches."
              }
            />
          ) : (
            variedMatches.map((match) => (
              <MatchCard
                key={match.matchedUserId}
                match={match}
                existing={connectionByUser.get(match.matchedUserId)}
                busy={busyId === match.matchedUserId}
                onDetails={() =>
                  router.push({
                    pathname: "/match/[matchedUserId]",
                    params: { matchedUserId: String(match.matchedUserId) },
                  })
                }
                onRequest={() => void send(match)}
              />
            ))
          )}
        </>
      ) : null}
      {!error && mode === "requests" ? (
        <>
          {pending.length === 0 ? (
            <Empty text="No pending cooking requests." />
          ) : (
            pending.map((item) => (
              <View key={item.id} style={styles.connectionCard}>
                <PersonSummary
                  name={item.otherUserName}
                  bio={item.otherUserBio}
                  profileImageUrl={item.otherUserProfileImageUrl}
                  cultures={item.otherUserFoodCultures}
                />
                <Text style={styles.requestText}>
                  {item.incoming
                    ? "Invited you to cook together."
                    : "Waiting for their response."}
                </Text>
                {item.incoming ? (
                  <View style={styles.actions}>
                    <Secondary
                      title="Decline"
                      disabled={busyId === item.id}
                      onPress={() => void respond(item, "DECLINED")}
                    />
                    <Primary
                      title="Accept"
                      disabled={busyId === item.id}
                      onPress={() => void respond(item, "ACCEPTED")}
                    />
                  </View>
                ) : null}
              </View>
            ))
          )}
        </>
      ) : null}
      {!error && mode === "connections" ? (
        <>
          {accepted.length === 0 ? (
            <Empty text="Accepted cooking connections will appear here." />
          ) : (
            accepted.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/connection/${item.id}`)}
                style={styles.connectionCard}
              >
                <PersonSummary
                  name={item.otherUserName}
                  bio={item.otherUserBio}
                  profileImageUrl={item.otherUserProfileImageUrl}
                  cultures={item.otherUserFoodCultures}
                />
                <Text style={styles.connected}>Plan your cook-up →</Text>
              </Pressable>
            ))
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

function MatchCard({
  match,
  existing,
  busy,
  onDetails,
  onRequest,
}: {
  match: CookingMatch;
  existing?: CookingConnection;
  busy: boolean;
  onDetails: () => void;
  onRequest: () => void;
}) {
  const meal = match.possibleMeals[0];
  const mealImage = meal?.imageUrl && meal.imageSource === "Pexels"
    ? meal.imageUrl.startsWith("/")
      ? buildApiUrl(meal.imageUrl)
      : meal.imageUrl
    : null;
  return (
    <View style={styles.matchCard}>
      {meal ? (
        <View style={styles.mealFeature}>
          {mealImage ? (
            <Image source={{ uri: mealImage }} style={styles.mealImage} />
          ) : (
            <View style={[styles.mealImage, styles.mealImageFallback]}>
              <Ionicons color="#506AA8" name="restaurant-outline" size={28} />
            </View>
          )}
          <LinearGradient
            colors={["rgba(10,24,17,0.42)", "transparent", "rgba(10,24,17,0.92)"]}
            locations={[0, 0.42, 1]}
            pointerEvents="none"
            style={styles.mealGradient}
          >
            <View style={styles.imageMetaRow}>
              <View style={styles.imageMetaPill}>
                <Ionicons color="#FFFFFF" name="location-outline" size={13} />
                <Text style={styles.imageMetaText}>{match.distanceKm.toFixed(1)} km</Text>
              </View>
              <View style={styles.imageMetaPill}>
                <Ionicons color="#FFFFFF" name="sparkles-outline" size={13} />
                <Text style={styles.imageMetaText}>{match.matchScore}% match</Text>
              </View>
            </View>
            <View style={styles.mealTitleBlock}>
              <Text numberOfLines={2} style={styles.mealName}>{meal.mealName}</Text>
              <Text style={styles.mealDescription}>{meal.culturalOrigin}</Text>
            </View>
          </LinearGradient>
        </View>
      ) : null}
      <View style={styles.cardBody}>
        <View style={styles.cookIdentity}>
          <Text numberOfLines={1} style={styles.cookName}>Cook with {match.matchedUserName}</Text>
          {match.matchedUserFoodCultures.length > 0 ? (
            <Text numberOfLines={1} style={styles.cookCultures}>
              {match.matchedUserFoodCultures.slice(0, 3).join(" · ")}
            </Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          <Secondary title="Details" onPress={onDetails} />
          <Primary
            title={
              existing?.status === "ACCEPTED"
                ? "Connected"
                : existing
                  ? "Request sent"
                  : "Cook Together"
            }
            disabled={Boolean(existing) || busy}
            busy={busy}
            onPress={onRequest}
          />
        </View>
      </View>
    </View>
  );
}
function RemovedIngredientLayout({
  label,
  foods,
  tone,
}: {
  label: string;
  foods: CookingMatch["yourContributions"];
  tone: "you" | "them";
}) {
  return (
    <View style={styles.ingredient}>
      <View style={[styles.ingredientMark, tone === "you" ? styles.yourMark : styles.theirMark]} />
      <View style={styles.ingredientCopy}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <Text numberOfLines={2} style={styles.ingredientText}>
          {foods.slice(0, 4).map((food) =>
            food.quantity ? `${food.name} (${food.quantity})` : food.name,
          ).join(" · ")}
        </Text>
      </View>
    </View>
  );
}

void RemovedIngredientLayout;

function diversifyMatches(matches: CookingMatch[]) {
  const usedMeals = new Set<string>();
  const seenUsers = new Set<number>();
  return matches.flatMap((match) => {
    if (seenUsers.has(match.matchedUserId)) return [];
    seenUsers.add(match.matchedUserId);
    const uniqueMeals = [...new Map(
      match.possibleMeals.map((meal) => [meal.mealName.trim().toLowerCase(), meal]),
    ).values()];
    const freshIndex = uniqueMeals.findIndex(
      (meal) => !usedMeals.has(meal.mealName.trim().toLowerCase()),
    );
    if (freshIndex > 0) {
      uniqueMeals.unshift(...uniqueMeals.splice(freshIndex, 1));
    }
    if (uniqueMeals[0]) usedMeals.add(uniqueMeals[0].mealName.trim().toLowerCase());
    const dedupeFoods = (foods: CookingMatch["yourContributions"]) =>
      [...new Map(foods.map((food) => [food.name.trim().toLowerCase(), food])).values()];
    return [{
      ...match,
      possibleMeals: uniqueMeals,
      yourContributions: dedupeFoods(match.yourContributions),
      theirContributions: dedupeFoods(match.theirContributions),
    }];
  });
}
function Primary({
  title,
  onPress,
  disabled,
  busy,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.primary, disabled && styles.disabled]}
    >
      {busy ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={styles.primaryText}>{title}</Text>
      )}
    </Pressable>
  );
}
function Secondary({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={styles.secondary}>
      <Text style={styles.secondaryText}>{title}</Text>
    </Pressable>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Nothing here yet</Text>
      <Text style={styles.subtitle}>{text}</Text>
    </View>
  );
}
export default function DefaultMatchesScreen() {
  return <MatchesScreen />;
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },
  embeddedContent: { paddingTop: 12 },
  listHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  listEyebrow: {
    color: colors.secondary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
  },
  listCount: {
    color: colors.textMuted,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  center: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    gap: 10,
    justifyContent: "center",
  },
  loading: {
    color: colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  inlineLoading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 2,
    paddingVertical: 12,
  },
  inlineLoadingText: {
    color: colors.textMuted,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  header: { gap: 4 },
  subtitle: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  tabs: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: 16,
    flexDirection: "row",
    padding: 4,
  },
  tab: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 42,
  },
  activeTab: { backgroundColor: colors.primary },
  tabText: {
    color: colors.textMuted,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  activeTabText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
  matchCard: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceHigh,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardBody: { gap: 14, padding: 15 },
  cookIdentity: { gap: 3, paddingHorizontal: 2 },
  cookName: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  cookCultures: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  matchMeta: { alignItems: "center", flexDirection: "row", gap: 14 },
  metaItem: { alignItems: "center", flexDirection: "row", gap: 5 },
  metaText: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  cardFooter: { gap: 15, padding: 16 },
  ingredientsList: {
    borderColor: colors.surfaceHigh,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 13,
  },
  ingredient: { alignItems: "center", flexDirection: "row", gap: 10, paddingVertical: 11 },
  ingredientMark: { borderRadius: 5, height: 10, width: 10 },
  yourMark: { backgroundColor: colors.primary },
  theirMark: { backgroundColor: colors.accent },
  ingredientCopy: { flex: 1, gap: 3 },
  ingredientDivider: { backgroundColor: colors.surfaceHigh, height: 1 },
  sectionLabel: {
    color: colors.secondary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.8,
  },
  ingredientText: {
    color: colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  mealFeature: { backgroundColor: colors.surfaceLow, position: "relative" },
  mealImage: { backgroundColor: colors.surfaceHigh, height: 292, width: "100%" },
  mealImageFallback: { alignItems: "center", justifyContent: "center" },
  mealGradient: {
    bottom: 0,
    justifyContent: "space-between",
    left: 0,
    padding: 15,
    position: "absolute",
    right: 0,
    top: 0,
  },
  mealName: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 25,
    lineHeight: 29,
  },
  imageMetaRow: { flexDirection: "row", gap: 7 },
  imageMetaPill: {
    alignItems: "center",
    backgroundColor: "rgba(13, 28, 20, 0.72)",
    borderRadius: 14,
    flexDirection: "row",
    gap: 4,
    minHeight: 28,
    paddingHorizontal: 9,
  },
  imageMetaText: {
    color: "#FFFFFF",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  mealTitleBlock: { gap: 3 },
  mealAttribution: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    paddingHorizontal: 8,
    position: "absolute",
    right: 0,
    textShadowColor: "#000000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    top: 4,
  },
  mealDescription: {
    color: "#F0EEE7",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  actions: { flexDirection: "row", gap: 9, marginTop: 2 },
  primary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 10,
  },
  primaryText: {
    color: "white",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  secondary: {
    alignItems: "center",
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.surfaceHigh,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 10,
  },
  secondaryText: {
    color: colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  disabled: { backgroundColor: "#8DA399" },
  connectionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceHigh,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  requestText: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  connected: { color: colors.primary, fontFamily: "Inter_600SemiBold" },
  empty: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.surfaceHigh,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 24,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
  },
});
