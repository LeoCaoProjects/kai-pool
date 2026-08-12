import { useLocalSearchParams } from "expo-router";
import { AuthEntryScreen } from "./RegisterScreen";

export default function LoginScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  return <AuthEntryScreen initialMode={mode === "register" ? "register" : "login"} />;
}
