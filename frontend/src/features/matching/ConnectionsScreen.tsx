import { StyleSheet, View } from "react-native";

import PageHeader from "../../ui/PageHeader";
import { colors } from "../../ui/theme";
import { MatchesScreen } from "./MatchesScreen";

export default function ConnectionsScreen() {
  return (
    <View style={styles.screen}>
      <PageHeader
        eyebrow="COOK TOGETHER"
        icon="chatbubbles"
        title="Connections"
      />
      <View style={styles.content}>
        <MatchesScreen
          initialMode="requests"
          modes={["requests", "connections"]}
          showHeader={false}
          stickyTabs
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { flex: 1 },
});
