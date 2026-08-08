import { MatchesScreen } from "./MatchesScreen";
export default function ConnectionsScreen() {
  return (
    <MatchesScreen initialMode="requests" modes={["requests", "connections"]} />
  );
}
