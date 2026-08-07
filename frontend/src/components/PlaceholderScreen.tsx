import { Text, View } from "react-native";

type PlaceholderScreenProps = {
  title: string;
  description: string;
  detail?: string;
};

export default function PlaceholderScreen({
  title,
  description,
  detail,
}: PlaceholderScreenProps) {
  return (
    <View style={{ flex: 1, justifyContent: "center", gap: 12, padding: 16 }}>
      <Text style={{ fontSize: 24 }}>{title}</Text>
      <Text>{description}</Text>
      {detail ? <Text>{detail}</Text> : null}
    </View>
  );
}
