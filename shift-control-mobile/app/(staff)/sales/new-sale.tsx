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
import { createSale } from "@/src/api/sales";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { Screen } from "@/src/components/Screen";
import { TextField } from "@/src/components/TextField";
import type { PaymentMethod } from "@/src/types/api";

const DEFAULT_PAYMENT_METHOD: PaymentMethod = "CASH";

function parsePositiveNumber(value: string): number | null {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parsePositiveInteger(value: string): number | null {
  const parsed = Number(value.trim());

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export default function NewSaleScreen() {
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quantityNumber = useMemo(() => parsePositiveInteger(quantity), [quantity]);
  const unitPriceNumber = useMemo(() => parsePositiveNumber(unitPrice), [unitPrice]);

  const finalTotal =
    quantityNumber !== null && unitPriceNumber !== null
      ? quantityNumber * unitPriceNumber
      : null;

  const canSubmit =
    productName.trim().length > 0 &&
    quantityNumber !== null &&
    unitPriceNumber !== null &&
    finalTotal !== null &&
    finalTotal > 0;

  async function handleSubmit() {
    if (!canSubmit || isSubmitting || finalTotal === null) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createSale({
        items: [
          {
            productName: productName.trim(),
            quantity: quantityNumber,
            unitPrice: unitPriceNumber,
          },
        ],
        discounts: [],
        payments: [
          {
            method: DEFAULT_PAYMENT_METHOD,
            amount: finalTotal,
          },
        ],
        invoiceStatus: "PENDING",
        note: note.trim().length > 0 ? note.trim() : undefined,
      });

      router.replace("/(staff)/home");
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
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>New sale</Text>
            <Text style={styles.subtitle}>
              Create a simple paid sale for the current shift.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Item</Text>

            <TextField
              label="Product name"
              value={productName}
              onChangeText={setProductName}
              placeholder="Example: Coffee"
              autoCapitalize="sentences"
            />

            <TextField
              label="Quantity"
              value={quantity}
              onChangeText={setQuantity}
              placeholder="1"
              keyboardType="number-pad"
            />

            <TextField
              label="Unit price"
              value={unitPrice}
              onChangeText={setUnitPrice}
              placeholder="10.00"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment</Text>
            <Text style={styles.body}>Method: CASH</Text>
            <Text style={styles.body}>
              Total: {finalTotal !== null ? `€${finalTotal.toFixed(2)}` : "—"}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Optional note</Text>

            <TextField
              label="Note"
              value={note}
              onChangeText={setNote}
              placeholder="Optional"
              autoCapitalize="sentences"
            />
          </View>

          <ErrorMessage message={errorMessage} />

          <View style={styles.actions}>
            <Button
              title="Create sale"
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
  content: {
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
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
});