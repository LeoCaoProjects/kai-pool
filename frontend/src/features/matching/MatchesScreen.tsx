import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { getCookingMatch, getCookingMatches } from "../../api/matches";
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
  stickyTabs = false,
}: {
  initialMode?: MatchMode;
  modes?: MatchMode[];
  showHeader?: boolean;
  stickyTabs?: boolean;
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
  const [responding, setResponding] = useState<{
    id: number;
    status: "ACCEPTED" | "DECLINED";
  } | null>(null);
  const requestedMatchMetadata = useRef(new Set<number>());
  const needsDiscover = modes.includes("discover");
  const [loading, setLoading] = useState(
    !cachedConnections || (needsDiscover && !cachedMatches),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async (refresh = false) => {
    const hasVisibleData = peekScreenCache("connections") !== undefined
      && (!needsDiscover || peekScreenCache("matches") !== undefined);
    if (refresh) setRefreshing(true);
    else if (!hasVisibleData) setLoading(true);
    setError("");
    try {
      if (needsDiscover) {
        const [foundConnections, foundMatches] = await Promise.all([
          loadScreenCache("connections", getCookingConnections, true),
          loadScreenCache("matches", getCookingMatches, true),
        ]);
        setConnections(foundConnections);
        setMatches(foundMatches);
      } else {
        const foundConnections = await loadScreenCache(
          "connections", getCookingConnections, true,
        );
        setConnections(foundConnections);
      }
    } catch (caught) {
      if (!hasVisibleData) {
        setError(
          caught instanceof ApiError
            ? caught.message
            : needsDiscover ? "Could not load cooking matches." : "Could not load connections.",
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [needsDiscover]);
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
  const matchByUser = useMemo(
    () => new Map(variedMatches.map((match) => [match.matchedUserId, match])),
    [variedMatches],
  );
  const visiblePending = pending;
  const discoverMatches = useMemo(
    () => variedMatches.filter((match) => !connectionByUser.has(match.matchedUserId)),
    [connectionByUser, variedMatches],
  );
  useEffect(() => {
    if (!needsDiscover) return;
    const missingIds = [...pending, ...accepted]
      .map((item) => item.otherUserId)
      .filter((id) => !matchByUser.has(id) && !requestedMatchMetadata.current.has(id));
    if (missingIds.length === 0) return;
    missingIds.forEach((id) => requestedMatchMetadata.current.add(id));
    void Promise.allSettled(missingIds.map((id) => getCookingMatch(id))).then((results) => {
      const recovered = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      if (recovered.length === 0) return;
      setMatches((current) => {
        const next = [...current];
        recovered.forEach((match) => {
          const index = next.findIndex((item) => item.matchedUserId === match.matchedUserId);
          if (index >= 0) next[index] = match;
          else next.push(match);
        });
        updateScreenCache("matches", next);
        return next;
      });
    });
  }, [accepted, matchByUser, needsDiscover, pending]);
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
    setResponding({ id: connection.id, status });
    const before = peekScreenCache("connections") ?? connections;
    const optimistic = status === "DECLINED"
      ? before.filter((item) => item.id !== connection.id)
      : before.map((item) => item.id === connection.id
          ? { ...item, status: "ACCEPTED" as const, respondedAt: new Date().toISOString() }
          : item);
    setConnections(optimistic);
    updateScreenCache("connections", optimistic);
    try {
      const updated = await respondToCookingConnection(connection.id, status);
      const current = peekScreenCache("connections") ?? before;
      const next = status === "DECLINED"
        ? current.filter((item) => item.id !== updated.id)
        : current.map((item) => (item.id === updated.id ? updated : item));
      setConnections(next);
      updateScreenCache("connections", next);
      if (status === "ACCEPTED") router.push(`/connection/${updated.id}`);
    } catch (caught) {
      setConnections(before);
      updateScreenCache("connections", before);
      Alert.alert(
        "Could not respond",
        caught instanceof ApiError ? caught.message : "Please try again.",
      );
    } finally {
      setBusyId(null);
      setResponding(null);
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
      stickyHeaderIndices={stickyTabs && modes.length > 1 ? [showHeader ? 1 : 0] : undefined}
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
        <View style={stickyTabs ? styles.stickyTabs : undefined}>
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
                  ? `Requests${visiblePending.length ? ` ${visiblePending.length}` : ""}`
                  : value === "connections"
                    ? `Connected${accepted.length ? ` ${accepted.length}` : ""}`
                    : "Discover"}
              </Text>
            </Pressable>
          ))}
        </View>
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
            <View style={styles.skeletonList}>
              <MatchSkeleton />
              <MatchSkeleton />
            </View>
          ) : null}
          {discoverMatches.length > 0 ? (
            <View style={styles.listHeading}>
              <Text style={styles.listEyebrow}>NEARBY COOKS</Text>
              <Text style={styles.listCount}>
                {discoverMatches.length} match{discoverMatches.length === 1 ? "" : "es"}
              </Text>
            </View>
          ) : null}
          {!loading && discoverMatches.length === 0 ? (
            <Empty
              text={
                user?.latitude == null
                  ? "Add your approximate location in Profile to discover nearby cooks."
                  : "Mark ingredients as Cook Together to find useful matches."
              }
            />
          ) : (
            discoverMatches.map((match) => (
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
          {loading && visiblePending.length === 0 ? (
            <View style={styles.skeletonList}><MatchSkeleton /><MatchSkeleton /></View>
          ) : visiblePending.length === 0 ? (
            <Empty text="No pending cooking requests." />
          ) : (
            visiblePending.map((item) => (
              <RequestCard
                key={item.id}
                busy={busyId === item.id}
                busyAction={responding?.id === item.id ? responding.status : null}
                connection={item}
                match={matchByUser.get(item.otherUserId)}
                onAccept={() => void respond(item, "ACCEPTED")}
                onDecline={() => void respond(item, "DECLINED")}
              />
            ))
          )}
        </>
      ) : null}
      {!error && mode === "connections" ? (
        <>
          {loading && accepted.length === 0 ? (
            <View style={styles.skeletonList}><MatchSkeleton /><MatchSkeleton /></View>
          ) : accepted.length === 0 ? (
            <Empty text="Accepted cooking connections will appear here." />
          ) : (
            accepted.map((item) => {
              const match = matchByUser.get(item.otherUserId);
              return (
              <View key={item.id}>
              <ConnectionMatchCard
                connection={item}
                match={match}
                onOpen={() => router.push(`/connection/${item.id}`)}
              />
              <Pressable
                onPress={() => router.push(`/connection/${item.id}`)}
                style={[styles.connectionCard, styles.legacyConnectionCard]}
              >
                <PersonSummary
                  name={item.otherUserName}
                  bio={item.otherUserBio}
                  profileImageUrl={item.otherUserProfileImageUrl}
                  cultures={item.otherUserFoodCultures}
                />
                <Text style={styles.connected}>Plan your cook-up →</Text>
              </Pressable>
              </View>
              );
            })
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
  const meal = match?.possibleMeals[0];
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
            </View>
          </LinearGradient>
        </View>
      ) : null}
      <View style={styles.cardBody}>
        <View style={styles.cookIdentity}>
          <Text numberOfLines={1} style={styles.cookName}>Cook with {match.matchedUserName}</Text>
          <Text numberOfLines={1} style={styles.cookInspiration}>
            {meal?.culturalOrigin}
          </Text>
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

function RequestCard({
  busy,
  busyAction,
  connection,
  match,
  onAccept,
  onDecline,
}: {
  busy: boolean;
  busyAction: "ACCEPTED" | "DECLINED" | null;
  connection: CookingConnection;
  match?: CookingMatch;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const meal = match?.possibleMeals[0];
  const imageUrl = meal?.imageUrl && meal.imageSource === "Pexels"
    ? meal.imageUrl.startsWith("/") ? buildApiUrl(meal.imageUrl) : meal.imageUrl
    : null;
  return (
    <View style={styles.matchCard}>
      <View style={styles.mealFeature}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.mealImage} />
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
              <Text style={styles.imageMetaText}>
                {match ? `${match.distanceKm.toFixed(1)} km` : "Nearby"}
              </Text>
            </View>
            <View style={styles.imageMetaPill}>
              <Ionicons color="#FFFFFF" name="sparkles-outline" size={13} />
              <Text style={styles.imageMetaText}>{match ? `${match.matchScore}% match` : "Cooking request"}</Text>
            </View>
          </View>
          <Text numberOfLines={2} style={styles.mealName}>{meal?.mealName ?? "Cook together"}</Text>
        </LinearGradient>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cookIdentity}>
          <Text numberOfLines={1} style={styles.cookName}>
            {connection.incoming
              ? `${connection.otherUserName} wants to cook with you`
              : `Request sent to ${connection.otherUserName}`}
          </Text>
          <Text numberOfLines={1} style={styles.cookInspiration}>
            {meal?.culturalOrigin ?? "Plan a meal using both food pools"}
          </Text>
        </View>
        {connection.incoming ? (
          <View style={styles.actions}>
            <Secondary
              title={busyAction === "DECLINED" ? "Declining" : "Decline"}
              busy={busyAction === "DECLINED"}
              disabled={busy}
              onPress={onDecline}
            />
            <Primary
              title={busyAction === "ACCEPTED" ? "Accepting" : "Accept"}
              disabled={busy}
              busy={busyAction === "ACCEPTED"}
              onPress={onAccept}
            />
          </View>
        ) : (
          <View style={styles.waitingRow}>
            <Ionicons color={colors.textMuted} name="time-outline" size={16} />
            <Text style={styles.waitingText}>Waiting for their response</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ConnectionMatchCard({
  connection,
  match,
  onOpen,
}: {
  connection: CookingConnection;
  match?: CookingMatch;
  onOpen: () => void;
}) {
  const meal = match?.possibleMeals[0];
  const imageUrl = meal?.imageUrl && meal.imageSource === "Pexels"
    ? meal.imageUrl.startsWith("/") ? buildApiUrl(meal.imageUrl) : meal.imageUrl
    : null;
  return (
    <View style={styles.matchCard}>
      <View style={styles.mealFeature}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.mealImage} /> : (
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
              <Text style={styles.imageMetaText}>
                {match ? `${match.distanceKm.toFixed(1)} km` : "Cooking connection"}
              </Text>
            </View>
            <View style={styles.imageMetaPill}>
              <Ionicons color="#FFFFFF" name="checkmark-circle-outline" size={13} />
              <Text style={styles.imageMetaText}>Connected</Text>
            </View>
          </View>
          <Text numberOfLines={2} style={styles.mealName}>{meal?.mealName ?? "Cook together"}</Text>
        </LinearGradient>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cookIdentity}>
          <Text numberOfLines={1} style={styles.cookName}>Cook with {connection.otherUserName}</Text>
          <Text numberOfLines={1} style={styles.cookInspiration}>
            {meal?.culturalOrigin ?? "Plan your next shared meal"}
          </Text>
        </View>
        <Pressable onPress={onOpen} style={styles.planButton}>
          <Text style={styles.planButtonText}>Plan your cook-up</Text>
          <Ionicons color="#FFFFFF" name="arrow-forward" size={17} />
        </Pressable>
      </View>
    </View>
  );
}

function MatchSkeleton() {
  const pulse = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 760, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.55, duration: 760, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);
  return (
    <Animated.View style={[styles.skeletonCard, { opacity: pulse }]}>
      <View style={styles.skeletonImage}>
        <View style={styles.skeletonPills}>
          <View style={styles.skeletonPill} />
          <View style={styles.skeletonPill} />
        </View>
        <View style={styles.skeletonMealName} />
      </View>
      <View style={styles.skeletonBody}>
        <View style={styles.skeletonName} />
        <View style={styles.skeletonSubtitle} />
        <View style={styles.skeletonButtons}>
          <View style={styles.skeletonButton} />
          <View style={styles.skeletonButton} />
        </View>
      </View>
    </Animated.View>
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
  busy = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={styles.secondary}>
      {busy ? <ActivityIndicator color={colors.primary} size="small" /> : null}
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
  embeddedContent: { paddingBottom: 132, paddingTop: 12 },
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
  stickyTabs: {
    backgroundColor: colors.background,
    paddingBottom: 8,
    paddingTop: 4,
    zIndex: 10,
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
  skeletonList: { gap: 16 },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceHigh,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  skeletonImage: {
    backgroundColor: "#E6E9E3",
    height: 292,
    justifyContent: "space-between",
    padding: 15,
  },
  skeletonPills: { flexDirection: "row", gap: 7 },
  skeletonPill: { backgroundColor: "#D3D8D1", borderRadius: 14, height: 28, width: 82 },
  skeletonMealName: { backgroundColor: "#D3D8D1", borderRadius: 7, height: 24, width: "68%" },
  skeletonBody: { gap: 9, padding: 15 },
  skeletonName: { backgroundColor: "#E2E6E0", borderRadius: 6, height: 18, width: "54%" },
  skeletonSubtitle: { backgroundColor: "#ECEFEA", borderRadius: 5, height: 13, width: "38%" },
  skeletonButtons: { flexDirection: "row", gap: 9, marginTop: 7 },
  skeletonButton: { backgroundColor: "#E2E6E0", borderRadius: 14, flex: 1, height: 46 },
  matchCard: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceHigh,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardBody: { gap: 14, padding: 15 },
  cookIdentity: { gap: 4, paddingHorizontal: 2 },
  cookName: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  cookInspiration: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
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
  waitingRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceLow,
    borderRadius: 14,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 46,
  },
  waitingText: {
    color: colors.textMuted,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  legacyConnectionCard: { display: "none" },
  planButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 46,
  },
  planButtonText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
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
    flexDirection: "row",
    gap: 7,
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
