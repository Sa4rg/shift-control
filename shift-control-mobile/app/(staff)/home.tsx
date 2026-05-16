import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthContext";
import { Screen } from "@/src/components/Screen";

export default function StaffHomeScreen() {
  const { user } = useAuth();

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Staff home</Text>
        <Text style={styles.subtitle}>Welcome, {user?.fullName}</Text>
        <Text style={styles.body}>
          Current shift detection will be implemented next.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 18,
    color: "#555555",
  },
  body: {
    fontSize: 16,
  },
});