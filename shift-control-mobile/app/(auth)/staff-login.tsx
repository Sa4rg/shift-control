import { Link, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { SecureTextInput } from "@/src/components/SecureTextInput";

export default function StaffLoginScreen() {
  const { loginStaff } = useAuth();

  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = username.trim().length > 0 && pin.length === 6;

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await loginStaff({ username: username.trim(), pin });
      router.replace("/");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Shift Control</Text>
            <Text style={styles.subtitle}>Staff login</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                placeholderTextColor="#9EACAA"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>PIN</Text>
              <SecureTextInput
                value={pin}
                onChangeText={setPin}
                placeholder="••••••"
                keyboardType="number-pad"
                maxLength={6}
                disabled={isSubmitting}
              />
            </View>

            <ErrorMessage message={errorMessage} />

            <Pressable
              style={[
                styles.button,
                (!canSubmit || isSubmitting) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </Pressable>

            <Link href="/(auth)/admin-login" style={styles.adminLink}>
              Login as admin
            </Link>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerHandle} />
            <Text style={styles.footerText}>Internal Corporate Tool</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#faf8ff",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 32,
    gap: 24,
  },
  header: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#00685f",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#3d4947",
    opacity: 0.7,
  },
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bcc9c6",
    borderRadius: 12,
    padding: 24,
    gap: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3d4947",
    letterSpacing: 0.7,
    marginLeft: 4,
  },
  input: {
    height: 48,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#d8e0dd",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#131b2e",
  },
  button: {
    height: 48,
    backgroundColor: "#00685f",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00685f",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.5,
    elevation: 0,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
    letterSpacing: 0.7,
  },
  adminLink: {
    alignSelf: "center",
    fontSize: 12,
    fontWeight: "500",
    color: "#3755c3",
    paddingVertical: 8,
  },
  footer: {
    alignItems: "center",
    gap: 16,
    paddingBottom: 16,
  },
  footerHandle: {
    width: 48,
    height: 6,
    backgroundColor: "rgba(188,201,198,0.3)",
    borderRadius: 9999,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(61,73,71,0.4)",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
});
