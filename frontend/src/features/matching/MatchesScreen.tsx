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
import type { CookingConnection, CookingMatch } from "../../types/models";
import { colors, sharedStyles } from "../../ui/theme";
import { useAuth } from "../auth/AuthContext";
import { PersonSummary } from "./MatchingComponents";

export type MatchMode = "discover" | "requests" | "connections";

export function MatchesScreen({
  initialMode = "discover",
  modes = ["discover", "requests", "connections"],
}: {
  initialMode?: MatchMode;
  modes?: MatchMode[];
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<MatchMode>(initialMode);
  const [matches, setMatches] = useState<CookingMatch[]>([]);
  const [connections, setConnections] = useState<CookingConnection[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const [foundMatches, foundConnections] = await Promise.all([
        getCookingMatches(),
        getCookingConnections(),
      ]);
      setMatches(foundMatches);
      setConnections(foundConnections);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not load cooking matches.",
      );
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
  const send = async (match: CookingMatch) => {
    setBusyId(match.matchedUserId);
    try {
      const created = await requestCookingConnection(match.matchedUserId);
      setConnections((current) => [
        created,
        ...current.filter((item) => item.id !== created.id),
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
  if (loading)
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
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
        />
      }
    >
      <View style={styles.header}>
        <Text style={sharedStyles.headline}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {modes.length > 1 ? (
        <View style={styles.tabs}>
          {modes.map((value) => (
            <Pressable
              key={value}
              onPress={() => setMode(value)}
              style={[styles.tab, mode === value && styles.activeTab]}
            >
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
          {matches.length === 0 ? (
            <Empty
              text={
                user?.latitude == null
                  ? "Add your approximate location in Profile to discover nearby cooks."
                  : "Mark ingredients as Cook Together to find useful matches."
              }
            />
          ) : (
            matches.map((match, index) => (
              <MatchCard
                key={match.matchedUserId}
                match={match}
                rank={index + 1}
                existing={connectionByUser.get(match.matchedUserId)}
                busy={busyId === match.matchedUserId}
                onDetails={() => router.push(`/match/${match.matchedUserId}`)}
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
  rank,
  existing,
  busy,
  onDetails,
  onRequest,
}: {
  match: CookingMatch;
  rank: number;
  existing?: CookingConnection;
  busy: boolean;
  onDetails: () => void;
  onRequest: () => void;
}) {
  const meal = match.possibleMeals[0];
  if (!meal) return null;
  return (
    <View style={styles.matchCard}>
      <View style={styles.cardBody}>
        <View style={styles.meta}>
          <Text style={styles.rank}>#{rank} match</Text>
          <Text style={styles.distance}>
            About {match.distanceKm.toFixed(1)} km away
          </Text>
        </View>
        <PersonSummary
          name={match.matchedUserName}
          bio={match.matchedUserBio}
          profileImageUrl={match.matchedUserProfileImageUrl}
          cultures={match.matchedUserFoodCultures}
        />
        <Ingredient
          label="THEY HAVE"
          value={match.theirContributions
            .map((food) =>
              food.quantity ? `${food.name} (${food.quantity})` : food.name,
            )
            .join(" · ")}
        />
        <Ingredient
          label="YOU MATCH WITH"
          value={match.yourContributions
            .map((food) =>
              food.quantity ? `${food.name} (${food.quantity})` : food.name,
            )
            .join(" · ")}
        />
        <View style={styles.mealRow}>
          {meal.imageUrl ? (
            <Image source={{ uri: meal.imageUrl }} style={styles.mealImage} />
          ) : (
            <View style={styles.mealImage} />
          )}
          <View style={styles.mealCopy}>
            <Text style={styles.sectionLabel}>SUGGESTED MEAL</Text>
            <Text style={styles.mealName}>{meal.mealName}</Text>
            <Text numberOfLines={2} style={styles.mealDescription}>
              {meal.description}
            </Text>
          </View>
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
function Ingredient({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.ingredient}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.ingredientText}>{value}</Text>
    </View>
  );
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
  header: { gap: 4 },
  subtitle: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  tabs: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: 12,
    flexDirection: "row",
    padding: 4,
  },
  tab: { alignItems: "center", borderRadius: 9, flex: 1, paddingVertical: 9 },
  activeTab: { backgroundColor: colors.surface },
  tabText: {
    color: colors.textMuted,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  activeTabText: { color: colors.primary, fontFamily: "Inter_600SemiBold" },
  matchCard: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceHigh,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardBody: { gap: 16, padding: 16 },
  meta: { flexDirection: "row", justifyContent: "space-between" },
  rank: {
    color: colors.secondary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  distance: {
    color: colors.secondary,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  ingredient: { gap: 4 },
  sectionLabel: {
    color: colors.secondary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.8,
  },
  ingredientText: {
    color: colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  mealRow: {
    backgroundColor: colors.surfaceLow,
    borderRadius: 12,
    flexDirection: "row",
    gap: 12,
    padding: 8,
  },
  mealImage: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: 8,
    height: 82,
    width: 82,
  },
  mealCopy: { flex: 1, gap: 2, justifyContent: "center" },
  mealName: {
    color: colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  mealDescription: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  actions: { flexDirection: "row", gap: 8 },
  primary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
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
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
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
