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
import { colors, fontWeight, fontSize, shadows, radius } from "@/src/theme";
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
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
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  appBarTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.secondaryDark,
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
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.card,
  },
  cardBody: {
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  inputGroup: {
    gap: 7,
  },
  inputLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  moneyInputRow: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputError: {
    borderColor: colors.danger,
  },
  moneyPrefix: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textSubtle,
  },
  moneyInput: {
    flex: 1,
    fontSize: fontSize.lg,
    color: colors.text,
    paddingVertical: 0,
  },
  helpText: {
    fontSize: fontSize.md,
    lineHeight: 19,
    color: colors.textMuted,
  },
  errorHelpText: {
    fontSize: fontSize.md,
    lineHeight: 19,
    color: colors.danger,
  },
  actions: {
    gap: 12,
    paddingTop: 6,
  },
  btnPrimary: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primaryButton,
  },
  btnDisabled: {
    backgroundColor: colors.primaryDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnPrimaryText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.extrabold,
    color: colors.surface,
  },
  btnCancel: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancelText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
  },
  buttonPressed: {
    opacity: 0.72,
  },
});