import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../ui/theme";

export default function WelcomeScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const compact = height < 720;
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(reveal, {
      duration: 680,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [reveal]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SafeAreaView edges={["top"]} style={styles.hero}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Ionicons color={colors.primary} name="leaf" size={17} />
          </View>
          <Text style={styles.brand}>Kai Pool</Text>
          <Text style={styles.brandNote}>FOOD, SHARED</Text>
        </View>

        <Animated.View style={[styles.copy, compact && styles.copyCompact, {
          opacity: reveal,
          transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        }]}>
          <Text style={[styles.title, compact && styles.titleCompact]}>
            More than food{`\n`}on the table.
          </Text>
          <Text style={styles.body}>
            Share what you have. Meet someone nearby. Make something together.
          </Text>
        </Animated.View>

        <Animated.View
          accessibilityLabel="Food and neighbours coming together"
          style={[styles.poolScene, compact && styles.poolSceneCompact, {
            opacity: reveal,
            transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
          }]}
        >
          <View style={styles.orbitLarge} />
          <View style={styles.orbitSmall} />
          <View style={[styles.token, styles.personOne]}>
            <Ionicons color="#FFFFFF" name="person" size={24} />
          </View>
          <View style={[styles.token, styles.personTwo]}>
            <Ionicons color="#FFFFFF" name="person" size={20} />
          </View>
          <View style={[styles.token, styles.carrot]}>
            <Ionicons color="#93472D" name="nutrition" size={27} />
          </View>
          <View style={[styles.token, styles.herb]}>
            <Ionicons color="#315947" name="leaf" size={24} />
          </View>
          <View style={[styles.token, styles.sun]}>
            <Ionicons color="#745D1B" name="sunny" size={23} />
          </View>
          <View style={styles.sharedPlate}>
            <View style={styles.sharedPlateInner}>
              <Ionicons color={colors.accent} name="restaurant" size={38} />
            </View>
          </View>
          <View style={styles.connectionOne} />
          <View style={styles.connectionTwo} />
        </Animated.View>
      </SafeAreaView>

      <View style={[styles.actionSheet, compact && styles.actionSheetCompact]}>
        <View style={styles.actionCopy}>
          <Text style={styles.actionEyebrow}>START WITH WHAT YOU HAVE</Text>
          <Text style={styles.actionTitle}>Your local table is waiting.</Text>
        </View>
        <Pressable
          onPress={() => router.push({ pathname: "/login", params: { mode: "register" } })}
          style={({ pressed }) => [styles.joinButton, pressed && styles.pressed]}
        >
          <Text style={styles.joinText}>Join Kai Pool</Text>
          <View style={styles.arrowCircle}>
            <Ionicons color={colors.primary} name="arrow-forward" size={18} />
          </View>
        </Pressable>
        <Pressable
          onPress={() => router.push("/login")}
          style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.primary} name="log-in-outline" size={19} />
          <Text style={styles.loginButtonText}>Sign in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.primary, flex: 1 },
  hero: { flex: 1, overflow: "hidden", paddingHorizontal: 24 },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 10, paddingTop: 12 },
  brandMark: {
    alignItems: "center", backgroundColor: "#E8DDBE", borderBottomLeftRadius: 13,
    borderTopRightRadius: 13, height: 34, justifyContent: "center", width: 34,
  },
  brand: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 19, letterSpacing: -0.3 },
  brandNote: { color: "#AFC3B5", fontFamily: "Inter_600SemiBold", fontSize: 9, letterSpacing: 1.4, marginLeft: "auto" },
  copy: { gap: 12, paddingTop: 43 },
  copyCompact: { paddingTop: 24 },
  title: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 40, letterSpacing: -1.7, lineHeight: 44 },
  titleCompact: { fontSize: 35, lineHeight: 39 },
  body: { color: "#D4DFD7", fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, maxWidth: 320 },
  poolScene: { alignSelf: "center", height: 250, marginTop: 20, position: "relative", width: 330 },
  poolSceneCompact: { marginTop: 5, transform: [{ scale: 0.86 }] },
  orbitLarge: { borderColor: "#426052", borderRadius: 112, borderWidth: 1, height: 224, left: 53, position: "absolute", top: 7, width: 224 },
  orbitSmall: { borderColor: "#345044", borderRadius: 78, borderWidth: 1, height: 156, left: 87, position: "absolute", top: 41, width: 156 },
  token: { alignItems: "center", justifyContent: "center", position: "absolute" },
  personOne: { backgroundColor: "#D17B47", borderRadius: 31, height: 62, left: 24, top: 38, width: 62 },
  personTwo: { backgroundColor: "#506AA8", borderRadius: 26, height: 52, right: 17, top: 126, width: 52 },
  carrot: { backgroundColor: "#EDC3AE", borderRadius: 29, height: 58, right: 32, top: 28, transform: [{ rotate: "10deg" }], width: 58 },
  herb: { backgroundColor: "#C5DCCB", borderBottomLeftRadius: 26, borderTopRightRadius: 26, bottom: 14, height: 52, left: 43, width: 52 },
  sun: { backgroundColor: "#E8D99B", borderRadius: 24, bottom: 2, height: 48, right: 89, transform: [{ rotate: "-8deg" }], width: 48 },
  sharedPlate: { alignItems: "center", backgroundColor: "#FBF4E8", borderRadius: 59, height: 118, justifyContent: "center", left: 106, position: "absolute", top: 64, width: 118 },
  sharedPlateInner: { alignItems: "center", borderColor: "#DED2BF", borderRadius: 43, borderWidth: 1, height: 86, justifyContent: "center", width: 86 },
  connectionOne: { backgroundColor: "#789084", height: 2, left: 76, position: "absolute", top: 96, transform: [{ rotate: "18deg" }], width: 46 },
  connectionTwo: { backgroundColor: "#789084", height: 2, position: "absolute", right: 62, top: 156, transform: [{ rotate: "-14deg" }], width: 55 },
  actionSheet: {
    backgroundColor: colors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30,
    gap: 17, paddingBottom: 30, paddingHorizontal: 24, paddingTop: 25,
  },
  actionSheetCompact: { gap: 12, paddingBottom: 18, paddingTop: 18 },
  actionCopy: { gap: 4 },
  actionEyebrow: { color: colors.secondary, fontFamily: "Inter_600SemiBold", fontSize: 9, letterSpacing: 1.4 },
  actionTitle: { color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 20, letterSpacing: -0.4, lineHeight: 27 },
  joinButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 16, flexDirection: "row", justifyContent: "space-between", minHeight: 58, paddingLeft: 20, paddingRight: 9 },
  joinText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  arrowCircle: { alignItems: "center", backgroundColor: "#E8DDBE", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  pressed: { transform: [{ scale: 0.992 }] },
  loginButton: {
    alignItems: "center", borderColor: colors.outline, borderRadius: 16, borderWidth: 1,
    flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 52,
  },
  loginButtonText: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
