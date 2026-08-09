import Ionicons from "@expo/vector-icons/Ionicons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "./theme";

type TabName =
  | "food-pool"
  | "discover"
  | "scan"
  | "connections"
  | "profile";

const tabDetails: Record<
  TabName,
  {
    activeIcon: keyof typeof Ionicons.glyphMap;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  }
> = {
  "food-pool": {
    activeIcon: "basket",
    icon: "basket-outline",
    label: "Food Pool",
  },
  discover: {
    activeIcon: "compass",
    icon: "compass-outline",
    label: "Discover",
  },
  scan: { activeIcon: "camera", icon: "camera-outline", label: "Scan" },
  connections: {
    activeIcon: "chatbubbles",
    icon: "chatbubbles-outline",
    label: "Connections",
  },
  profile: {
    activeIcon: "person-circle",
    icon: "person-circle-outline",
    label: "Profile",
  },
};

export default function KaiTabBar({
  descriptors,
  navigation,
  state,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <NavigationSurface
      activeRoute={state.routes[state.index]?.name as TabName}
      routes={state.routes.map((route) => route.name as TabName)}
      onLongPress={(routeName) => {
        const route = state.routes.find((item) => item.name === routeName);
        if (route) navigation.emit({ target: route.key, type: "tabLongPress" });
      }}
      onSelect={(routeName) => {
        const route = state.routes.find((item) => item.name === routeName);
        if (!route) return;

        const event = navigation.emit({
          canPreventDefault: true,
          target: route.key,
          type: "tabPress",
        });
        if (
          !event.defaultPrevented &&
          route.name !== state.routes[state.index]?.name
        ) {
          navigation.navigate(route.name, route.params);
        }
      }}
      accessibilityLabels={Object.fromEntries(
        state.routes.map((route) => [
          route.name,
          descriptors[route.key].options.tabBarAccessibilityLabel,
        ]),
      )}
      bottomSpacing={Math.max(insets.bottom - 10, 8)}
      edgeToEdge={state.routes[state.index]?.name === "discover"}
    />
  );
}

export function KaiTabBarPreview({ activeRoute }: { activeRoute: TabName }) {
  return (
    <NavigationSurface
      activeRoute={activeRoute}
      bottomSpacing={7}
      edgeToEdge={false}
      routes={Object.keys(tabDetails) as TabName[]}
    />
  );
}

function NavigationSurface({
  accessibilityLabels = {},
  activeRoute,
  bottomSpacing,
  edgeToEdge,
  onLongPress,
  onSelect,
  routes,
}: {
  accessibilityLabels?: Record<string, string | undefined>;
  activeRoute: TabName;
  bottomSpacing: number;
  edgeToEdge: boolean;
  onLongPress?: (route: TabName) => void;
  onSelect?: (route: TabName) => void;
  routes: TabName[];
}) {
  return (
    <View
      style={[
        styles.navigationArea,
        edgeToEdge && styles.edgeToEdgeNavigationArea,
        { paddingBottom: bottomSpacing },
      ]}
    >
      <View style={styles.navigationBar}>
        {routes.map((routeName) => {
          const details = tabDetails[routeName];
          const active = activeRoute === routeName;
          const scan = routeName === "scan";

          return (
            <Pressable
              accessibilityLabel={
                accessibilityLabels[routeName] || details.label
              }
              accessibilityRole="button"
              accessibilityState={active ? { selected: true } : {}}
              key={routeName}
              onLongPress={() => onLongPress?.(routeName)}
              onPress={() => onSelect?.(routeName)}
              style={({ pressed }) => [
                styles.tab,
                pressed && styles.pressedTab,
              ]}
            >
              <View style={[styles.iconWrap, scan && styles.scanIconWrap]}>
                <Ionicons
                  color={scan ? "#FFFFFF" : active ? colors.primary : "#68706B"}
                  name={active ? details.activeIcon : details.icon}
                  size={scan ? 22 : 23}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navigationArea: {
    backgroundColor: colors.background,
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  edgeToEdgeNavigationArea: {
    backgroundColor: "transparent",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
  navigationBar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.surfaceHigh,
    borderRadius: 28,
    borderWidth: 1,
    elevation: 9,
    flexDirection: "row",
    height: 62,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: "#173124",
    shadowOffset: { height: -3, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  tab: {
    alignItems: "center",
    borderRadius: 20,
    flex: 1,
    height: 48,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 2,
  },
  pressedTab: { transform: [{ scale: 0.94 }] },
  iconWrap: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 36,
  },
  scanIconWrap: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 38,
    width: 42,
  },
});
