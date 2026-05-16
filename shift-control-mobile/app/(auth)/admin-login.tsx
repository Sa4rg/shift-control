import { Link, router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { useAuth } from "@/src/auth/AuthContext";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { Screen } from "@/src/components/Screen";
import { TextField } from "@/src/components/TextField";

export default function AdminLoginScreen() {
  const { loginAdmin } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = username.trim().length > 0 && password.length > 0;

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await loginAdmin({
        username: username.trim(),
        password,
      });

      router.replace("/");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Shift Control</Text>
            <Text style={styles.subtitle}>Admin login</Text>
          </View>

          <View style={styles.card}>
            <TextField
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              autoCapitalize="none"
            />

            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
            />

            <ErrorMessage message={errorMessage} />

            <Button
              title="Login"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={!canSubmit}
            />

            <Link href="/(auth)/staff-login" style={styles.link}>
              Login as staff
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
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
  link: {
    alignSelf: "center",
    fontSize: 16,
    fontWeight: "600",
  },
});