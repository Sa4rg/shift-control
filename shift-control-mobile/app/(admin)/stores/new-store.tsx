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
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { colors, commonStyles, fontWeight, fontSize, radius } from "@/src/theme";
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

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [baseCashAmount, setBaseCashAmount] = useState("");
  const [wifiSsid, setWifiSsid] = useState("");
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
    wifiSsid.trim().length > 0 &&
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
        wifiSsid: wifiSsid.trim(),
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

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <AppTopBar variant="back" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={commonStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={commonStyles.pageHeader}>
            <Text style={commonStyles.pageTitle}>Create store</Text>
            <Text style={commonStyles.pageSubtitle}>
              Enter details to create a new store.
            </Text>
          </View>

          <View style={commonStyles.card}>
            <View style={commonStyles.cardBody}>
              <Text style={commonStyles.sectionLabel}>Store information</Text>

              <View style={commonStyles.inputGroup}>
                <Text style={commonStyles.inputLabel}>Name</Text>
                <TextInput
                  style={commonStyles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Main Station"
                  placeholderTextColor="#6d7a77"
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
              </View>

              <View style={commonStyles.inputGroup}>
                <Text style={commonStyles.inputLabel}>Address</Text>
                <TextInput
                  style={commonStyles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="e.g. 123 Business St"
                  placeholderTextColor="#6d7a77"
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
              </View>

              <View style={commonStyles.inputGroup}>
                <Text style={commonStyles.inputLabel}>Wi-Fi network name</Text>

                <TextInput
                  style={[
                    commonStyles.input,
                    wifiSsid.length > 0 &&
                      wifiSsid.trim().length === 0 &&
                      styles.inputError,
                  ]}
                  value={wifiSsid}
                  onChangeText={setWifiSsid}
                  placeholder="e.g. MEO-4A6DA0"
                  placeholderTextColor="#6d7a77"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  maxLength={32}
                />
              </View>

              {wifiSsid.length > 0 && wifiSsid.trim().length === 0 ? (
                <Text style={styles.errorHelpText}>
                  Wi-Fi network name cannot be empty.
                </Text>
              ) : null}

              <Text style={commonStyles.helpText}>
                Enter the exact Wi-Fi network name shown on the device.
              </Text>

              <View style={commonStyles.inputGroup}>
                <Text style={commonStyles.inputLabel}>Base cash amount</Text>

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
                <Text style={commonStyles.helpText}>
                  Base cash amount: {formatMoney(baseCashAmountNumber)}
                </Text>
              ) : null}
            </View>
          </View>

          {errorMessage ? <ErrorMessage message={errorMessage} /> : null}

          <View style={commonStyles.actions}>
            <Pressable
              testID="create-store-button"
              style={({ pressed }) => [
                commonStyles.primaryButton,
                !canSubmit && commonStyles.buttonDisabled,
                pressed && canSubmit && commonStyles.buttonPressed,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              <Text style={commonStyles.primaryButtonText}>
                {isSubmitting ? "Creating…" : "Create store"}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                commonStyles.textButton,
                pressed && commonStyles.buttonPressed,
              ]}
              onPress={() => router.back()}
              disabled={isSubmitting}
            >
              <Text style={commonStyles.textButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
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
  errorHelpText: {
    fontSize: fontSize.md,
    lineHeight: 19,
    color: colors.danger,
  },
});