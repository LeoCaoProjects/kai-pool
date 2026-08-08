import { StyleSheet, Text, View } from "react-native";
import { colors } from "./theme";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BrandHeader({
  title = "Kai Pool",
}: {
  title?: string;
}) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background },
  header: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderBottomColor: colors.outline,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    minHeight: 64,
    paddingHorizontal: 20,
  },
  title: { color: colors.primary, fontSize: 20, fontWeight: "700" },
});
