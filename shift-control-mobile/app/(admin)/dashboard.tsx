import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthContext";
import { Button } from "@/src/components/Button";
import { Screen } from "@/src/components/Screen";

export default function AdminDashboardScreen() {
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace("/");
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin dashboard</Text>
          <Text style={styles.subtitle}>Welcome, {user?.fullName}</Text>
        </View>

        <Text style={styles.body}>
          Admin tools will be implemented after the staff MVP flow.
        </Text>

        <View style={styles.footer}>
          <Button title="Logout" onPress={handleLogout} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  header: {
    gap: 6,
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
    lineHeight: 22,
  },
  footer: {
    marginTop: "auto",
  },
});