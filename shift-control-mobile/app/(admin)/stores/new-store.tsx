import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { createStore } from "@/src/api/stores";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { Screen } from "@/src/components/Screen";
import { TextField } from "@/src/components/TextField";
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

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Create store</Text>
            <Text style={styles.subtitle}>
              Create a store with its base cash amount for shift closures.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Store information</Text>

            <TextField
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Example: Main Store"
              autoCapitalize="words"
            />

            <TextField
              label="Address"
              value={address}
              onChangeText={setAddress}
              placeholder="Example: Main Street 123"
              autoCapitalize="sentences"
            />

            <TextField
              label="Base cash amount"
              value={baseCashAmount}
              onChangeText={setBaseCashAmount}
              placeholder="103.00"
              keyboardType="decimal-pad"
            />

            {baseCashAmount.length > 0 && baseCashAmountNumber === null ? (
              <Text style={styles.helpText}>
                Base cash amount must be greater than zero.
              </Text>
            ) : null}

            {baseCashAmountNumber !== null ? (
              <Text style={styles.helpText}>
                Base cash amount: {formatMoney(baseCashAmountNumber)}
              </Text>
            ) : null}
          </View>

          <ErrorMessage message={errorMessage} />

          <View style={styles.actions}>
            <Button
              title="Create store"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={!canSubmit}
            />

            <Button
              title="Cancel"
              onPress={() => router.back()}
              disabled={isSubmitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    gap: 16,
    padding: 24,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    color: "#555555",
    lineHeight: 22,
  },
  card: {
    gap: 12,
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#555555",
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
});