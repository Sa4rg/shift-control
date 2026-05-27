import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
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
import { createStore } from "@/src/api/stores";
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { formatMoney } from "@/src/utils/money";

function parsePositiveNumber(value: string): number | null {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export default function NewStoreScreen() {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [baseCashAmount, setBaseCashAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const baseCashAmountNumber = useMemo(
    () => parsePositiveNumber(baseCashAmount),
    [baseCashAmount]
  );

  const canSubmit =
    name.trim().length > 0 &&
    address.trim().length > 0 &&
    baseCashAmountNumber !== null &&
    !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit || baseCashAmountNumber === null) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createStore({
        name: name.trim(),
        address: address.trim(),
        baseCashAmount: baseCashAmountNumber,
      });

      router.replace("/(admin)/dashboard");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBaseCashAmountChange(value: string) {
    setBaseCashAmount(value.replace(/[^\d.,]/g, ""));
  }

  const displayName = user?.fullName ?? user?.username ?? "Admin";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <Pressable
            style={({ pressed }) => [
              styles.appBarBackButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.back()}
            disabled={isSubmitting}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>

          <Text style={styles.appBarTitle}>Shift Control</Text>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Create store</Text>
            <Text style={styles.pageSubtitle}>
              Enter details to create a new store.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.sectionTitle}>Store information</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Main Station"
                  placeholderTextColor="#6d7a77"
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="e.g. 123 Business St"
                  placeholderTextColor="#6d7a77"
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Base cash amount</Text>

                <View
                  style={[
                    styles.moneyInputRow,
                    baseCashAmount.length > 0 &&
                      baseCashAmountNumber === null &&
                      styles.inputError,
                  ]}
                >
                  <Text style={styles.moneyPrefix}>€</Text>
                  <TextInput
                    style={styles.moneyInput}
                    value={baseCashAmount}
                    onChangeText={handleBaseCashAmountChange}
                    placeholder="103.00"
                    placeholderTextColor="#6d7a77"
                    keyboardType="decimal-pad"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {baseCashAmount.length > 0 && baseCashAmountNumber === null ? (
                <Text style={styles.errorHelpText}>
                  Base cash amount must be greater than zero.
                </Text>
              ) : null}

              {baseCashAmountNumber !== null ? (
                <Text style={styles.helpText}>
                  Base cash amount: {formatMoney(baseCashAmountNumber)}
                </Text>
              ) : null}
            </View>
          </View>

          {errorMessage ? <ErrorMessage message={errorMessage} /> : null}

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.btnPrimary,
                !canSubmit && styles.btnDisabled,
                pressed && canSubmit && styles.buttonPressed,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              <Text style={styles.btnPrimaryText}>
                {isSubmitting ? "Creating…" : "Create store"}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnCancel,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.back()}
              disabled={isSubmitting}
            >
              <Text style={styles.btnCancelText}>Cancel</Text>
            </Pressable>
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
  appBar: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
  },
  appBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  appBarBackButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 20,
    fontWeight: "700",
    color: "#00685f",
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#00685f",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#dde1ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bcc9c6",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#00217a",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    gap: 16,
  },
  pageHeader: {
    gap: 5,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#131b2e",
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 15,
    color: "#3d4947",
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardBody: {
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#00685f",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  inputGroup: {
    gap: 7,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3d4947",
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bcc9c6",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#131b2e",
  },
  moneyInputRow: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bcc9c6",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputError: {
    borderColor: "#ba1a1a",
  },
  moneyPrefix: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6d7a77",
  },
  moneyInput: {
    flex: 1,
    fontSize: 15,
    color: "#131b2e",
    paddingVertical: 0,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#3d4947",
  },
  errorHelpText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#ba1a1a",
  },
  actions: {
    gap: 12,
    paddingTop: 6,
  },
  btnPrimary: {
    height: 52,
    borderRadius: 999,
    backgroundColor: "#00685f",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00685f",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  btnDisabled: {
    backgroundColor: "#9ecbc7",
    shadowOpacity: 0,
    elevation: 0,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#ffffff",
  },
  btnCancel: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#00685f",
  },
  buttonPressed: {
    opacity: 0.72,
  },
});