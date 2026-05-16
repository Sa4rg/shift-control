import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthContext";
import { Screen } from "@/src/components/Screen";

export default function AdminDashboardScreen() {
  const { user } = useAuth();

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Admin dashboard</Text>
        <Text style={styles.subtitle}>Welcome, {user?.fullName}</Text>
        <Text style={styles.body}>
          Admin tools will be implemented after the staff MVP flow.
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