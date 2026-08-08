import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "./theme";

export default function PageHeader({
  action,
  eyebrow,
  icon,
  title,
}: {
  action?: ReactNode;
  eyebrow: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headingRow}>
        <View style={styles.iconMark}>
          <Ionicons color="#FFFFFF" name={icon} size={23} />
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceHigh,
    borderRadius: 26,
    borderWidth: 1,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 18,
  },
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 13,
  },
  iconMark: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 15,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  headingCopy: { flex: 1 },
  eyebrow: {
    color: colors.secondary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.2,
    lineHeight: 14,
    marginBottom: 2,
  },
  title: {
    color: colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 25,
    letterSpacing: -0.6,
    lineHeight: 31,
  },
  action: { marginLeft: 2 },
});
