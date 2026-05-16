import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/src/components/Screen";

export default function StaffLoginScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Shift Control</Text>
          <Text style={styles.subtitle}>Staff login</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.placeholder}>
            Staff login form will be implemented next.
          </Text>

          <Link href="/(auth)/admin-login" style={styles.link}>
            Login as admin
          </Link>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: 32,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 18,
    color: "#555555",
  },
  card: {
    gap: 16,
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 16,
    padding: 20,
  },
  placeholder: {
    fontSize: 16,
  },
  link: {
    fontSize: 16,
    fontWeight: "600",
  },
});