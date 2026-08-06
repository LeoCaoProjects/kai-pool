import { StyleSheet, Text, View } from "react-native";

import { API_BASE_URL } from "../src/config/api";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kai Pool</Text>
      <Text style={styles.subtitle}>The hackathon development environment is ready.</Text>
      {__DEV__ && <Text style={styles.apiUrl}>API: {API_BASE_URL}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  apiUrl: {
    color: "#555",
    textAlign: "center",
  },
});
