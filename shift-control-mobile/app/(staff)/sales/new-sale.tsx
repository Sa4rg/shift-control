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
import type {
  CreateSaleDiscountRequest,
  DiscountReason,
  PaymentMethod,
} from "@/src/types/api";
import { formatMoney } from "@/src/utils/money";

type DiscountSelection = "NONE" | DiscountReason;
type PaymentMode = "SINGLE" | "SPLIT";
type SplitPaymentVariant = "REGISTER_METHODS" | "GLOVO_ONLINE_ONLY";

const PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "MB",
  "GLOVO_ONLINE",
  "GLOVO_CASH",
];

const SPLIT_REGISTER_METHODS: PaymentMethod[] = ["CASH", "MB", "GLOVO_CASH"];

const DISCOUNT_OPTIONS: DiscountSelection[] = [
  "NONE",
  "LOYALTY_CARD",
  "VOUCHER_10_PERCENT",
  "MANUAL_DISCOUNT",
];

const PAYMENT_METHOD_HELP: Record<PaymentMethod, string> = {
  CASH: "Cash received directly in the register.",
  MB: "Card terminal payment.",
  GLOVO_ONLINE:
    "Glovo order already paid through the Glovo platform. It does not affect physical cash or MB terminal totals.",
  GLOVO_CASH:
    "Glovo order paid in cash to staff. It affects physical cash and Glovo totals.",
};

const DISCOUNT_HELP: Record<DiscountSelection, string> = {
  NONE: "No discount will be applied.",
  LOYALTY_CARD:
    "Applies a fixed €20.00 discount. Requires subtotal of at least €25.00.",
  VOUCHER_10_PERCENT:
    "Applies a 10% discount over the original subtotal.",
  MANUAL_DISCOUNT:
    "Applies a custom fixed amount. Requires amount and approval note.",
};

function parsePositiveNumber(value: string): number | null {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseOptionalPositiveNumber(value: string): {
  amount: number | null;
  isValid: boolean;
} {
  if (value.trim().length === 0) {
    return {
      amount: null,
      isValid: true,
    };
  }

  const parsed = parsePositiveNumber(value);

  return {
    amount: parsed,
    isValid: parsed !== null,
  };
}

function parsePositiveInteger(value: string): number | null {
  const parsed = Number(value.trim());

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getDiscountLabel(discount: DiscountSelection): string {
  switch (discount) {
    case "NONE":
      return "No discount";
    case "LOYALTY_CARD":
      return "Loyalty card";
    case "VOUCHER_10_PERCENT":
      return "Voucher 10%";
    case "MANUAL_DISCOUNT":
      return "Manual discount";
  }
}

function calculateDiscountAmount({
  subtotal,
  discount,
  manualDiscountAmount,
}: {
  subtotal: number | null;
  discount: DiscountSelection;
  manualDiscountAmount: number | null;
}): number | null {
  if (subtotal === null) {
    return null;
  }

  if (discount === "NONE") {
    return 0;
  }

  if (discount === "LOYALTY_CARD") {
    return subtotal >= 25 ? 20 : null;
  }

  if (discount === "VOUCHER_10_PERCENT") {
    return roundMoney(subtotal * 0.1);
  }

  if (manualDiscountAmount === null) {
    return null;
  }

  return manualDiscountAmount;
}

function buildDiscounts({
  discount,
  manualDiscountAmount,
  manualDiscountNote,
}: {
  discount: DiscountSelection;
  manualDiscountAmount: number | null;
  manualDiscountNote: string;
}): CreateSaleDiscountRequest[] {
  if (discount === "NONE") {
    return [];
  }

  if (discount === "LOYALTY_CARD") {
    return [{ reason: "LOYALTY_CARD" }];
  }

  if (discount === "VOUCHER_10_PERCENT") {
    return [{ reason: "VOUCHER_10_PERCENT" }];
  }

  if (manualDiscountAmount === null) {
    return [];
  }

  return [
    {
      reason: "MANUAL_DISCOUNT",
      amount: manualDiscountAmount,
      note: manualDiscountNote.trim(),
    },
  ];
}

export default function NewSaleScreen() {
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("SINGLE");
  const [splitPaymentVariant, setSplitPaymentVariant] =
    useState<SplitPaymentVariant>("REGISTER_METHODS");
  const [splitCashAmount, setSplitCashAmount] = useState("");
  const [splitMbAmount, setSplitMbAmount] = useState("");
  const [splitGlovoCashAmount, setSplitGlovoCashAmount] = useState("");
  const [selectedDiscount, setSelectedDiscount] =
    useState<DiscountSelection>("NONE");
  const [manualDiscountAmount, setManualDiscountAmount] = useState("");
  const [manualDiscountNote, setManualDiscountNote] = useState("");
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quantityNumber = useMemo(
    () => parsePositiveInteger(quantity),
    [quantity]
  );

  const unitPriceNumber = useMemo(
    () => parsePositiveNumber(unitPrice),
    [unitPrice]
  );

  const manualDiscountAmountNumber = useMemo(
    () => parsePositiveNumber(manualDiscountAmount),
    [manualDiscountAmount]
  );

  const splitCash = useMemo(
    () => parseOptionalPositiveNumber(splitCashAmount),
    [splitCashAmount]
  );

  const splitMb = useMemo(
    () => parseOptionalPositiveNumber(splitMbAmount),
    [splitMbAmount]
  );

  const splitGlovoCash = useMemo(
    () => parseOptionalPositiveNumber(splitGlovoCashAmount),
    [splitGlovoCashAmount]
  );

  const subtotal =
    quantityNumber !== null && unitPriceNumber !== null
      ? roundMoney(quantityNumber * unitPriceNumber)
      : null;

  const discountAmount = calculateDiscountAmount({
    subtotal,
    discount: selectedDiscount,
    manualDiscountAmount: manualDiscountAmountNumber,
  });

  const finalTotal =
    subtotal !== null && discountAmount !== null
      ? roundMoney(subtotal - discountAmount)
      : null;

  const splitPaymentTotal = roundMoney(
    (splitCash.amount ?? 0) +
      (splitMb.amount ?? 0) +
      (splitGlovoCash.amount ?? 0)
  );

  const splitRemaining =
    finalTotal !== null ? roundMoney(finalTotal - splitPaymentTotal) : null;

  const isSplitPaymentAmountValid =
    splitCash.isValid && splitMb.isValid && splitGlovoCash.isValid;

  const isSplitPaymentTotalValid =
    paymentMode === "SINGLE" ||
    splitPaymentVariant === "GLOVO_ONLINE_ONLY" ||
    (finalTotal !== null &&
      splitPaymentTotal > 0 &&
      roundMoney(splitPaymentTotal) === roundMoney(finalTotal));

  const isLoyaltyDiscountAllowed =
    selectedDiscount !== "LOYALTY_CARD" ||
    (subtotal !== null && subtotal >= 25);

  const isManualDiscountValid =
    selectedDiscount !== "MANUAL_DISCOUNT" ||
    (manualDiscountAmountNumber !== null &&
      subtotal !== null &&
      manualDiscountAmountNumber < subtotal &&
      manualDiscountNote.trim().length > 0);

  const isDiscountValid =
    discountAmount !== null &&
    discountAmount >= 0 &&
    isLoyaltyDiscountAllowed &&
    isManualDiscountValid;

  const canSubmit =
    productName.trim().length > 0 &&
    quantityNumber !== null &&
    unitPriceNumber !== null &&
    subtotal !== null &&
    isDiscountValid &&
    finalTotal !== null &&
    finalTotal > 0 &&
    isSplitPaymentAmountValid &&
    isSplitPaymentTotalValid &&
    !isSubmitting;

  function buildPayments(finalAmount: number) {
    if (paymentMode === "SINGLE") {
      return [
        {
          method: paymentMethod,
          amount: finalAmount,
        },
      ];
    }

    if (splitPaymentVariant === "GLOVO_ONLINE_ONLY") {
      return [
        {
          method: "GLOVO_ONLINE" as const,
          amount: finalAmount,
        },
      ];
    }

    return [
      {
        method: "CASH" as const,
        amount: splitCash.amount,
      },
      {
        method: "MB" as const,
        amount: splitMb.amount,
      },
      {
        method: "GLOVO_CASH" as const,
        amount: splitGlovoCash.amount,
      },
    ]
      .filter(
        (
          payment
        ): payment is {
          method: "CASH" | "MB" | "GLOVO_CASH";
          amount: number;
        } => payment.amount !== null && payment.amount > 0
      )
      .map((payment) => ({
        method: payment.method,
        amount: roundMoney(payment.amount),
      }));
  }

  async function handleSubmit() {
    if (
      !canSubmit ||
      quantityNumber === null ||
      unitPriceNumber === null ||
      finalTotal === null
    ) {
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
        discounts: buildDiscounts({
          discount: selectedDiscount,
          manualDiscountAmount: manualDiscountAmountNumber,
          manualDiscountNote,
        }),
        payments: buildPayments(finalTotal),
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
              Create a paid sale for the current shift.
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
            <Text style={styles.cardTitle}>Discount</Text>

            <View style={styles.options}>
              {DISCOUNT_OPTIONS.map((discount) => {
                const isDisabled =
                  isSubmitting ||
                  (discount === "LOYALTY_CARD" &&
                    subtotal !== null &&
                    subtotal < 25);

                return (
                  <Button
                    key={discount}
                    title={
                      discount === selectedDiscount
                        ? `✓ ${getDiscountLabel(discount)}`
                        : getDiscountLabel(discount)
                    }
                    onPress={() => setSelectedDiscount(discount)}
                    disabled={isDisabled}
                  />
                );
              })}
            </View>

            <Text style={styles.helpText}>
              {DISCOUNT_HELP[selectedDiscount]}
            </Text>

            {selectedDiscount === "LOYALTY_CARD" &&
            subtotal !== null &&
            subtotal < 25 ? (
              <Text style={styles.warningText}>
                Loyalty card discount requires subtotal of at least{" "}
                {formatMoney(25)}.
              </Text>
            ) : null}

            {selectedDiscount === "MANUAL_DISCOUNT" ? (
              <>
                <TextField
                  label="Manual discount amount"
                  value={manualDiscountAmount}
                  onChangeText={setManualDiscountAmount}
                  placeholder="5.00"
                  keyboardType="decimal-pad"
                />

                {manualDiscountAmount.length > 0 &&
                manualDiscountAmountNumber === null ? (
                  <Text style={styles.warningText}>
                    Manual discount amount must be greater than zero.
                  </Text>
                ) : null}

                {manualDiscountAmountNumber !== null &&
                subtotal !== null &&
                manualDiscountAmountNumber >= subtotal ? (
                  <Text style={styles.warningText}>
                    Manual discount must be lower than subtotal.
                  </Text>
                ) : null}

                <TextField
                  label="Manual discount note"
                  value={manualDiscountNote}
                  onChangeText={setManualDiscountNote}
                  placeholder="Example: Manager approved"
                  autoCapitalize="sentences"
                />

                {manualDiscountAmount.length > 0 &&
                manualDiscountNote.trim().length === 0 ? (
                  <Text style={styles.warningText}>
                    Manual discount requires a note.
                  </Text>
                ) : null}
              </>
            ) : null}

            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                {subtotal !== null ? formatMoney(subtotal) : "—"}
              </Text>
            </View>

            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>
                {discountAmount !== null ? formatMoney(discountAmount) : "—"}
              </Text>
            </View>

            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Final total</Text>
              <Text style={styles.totalValue}>
                {finalTotal !== null ? formatMoney(finalTotal) : "—"}
              </Text>
            </View>

            {finalTotal !== null && finalTotal <= 0 ? (
              <Text style={styles.warningText}>
                Final total must be greater than zero.
              </Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment</Text>

            <View style={styles.options}>
              <Button
                title={
                  paymentMode === "SINGLE" ? "✓ Single payment" : "Single payment"
                }
                onPress={() => setPaymentMode("SINGLE")}
                disabled={isSubmitting}
              />
              <Button
                title={
                  paymentMode === "SPLIT" ? "✓ Split payment" : "Split payment"
                }
                onPress={() => setPaymentMode("SPLIT")}
                disabled={isSubmitting}
              />
            </View>

            {paymentMode === "SINGLE" ? (
              <>
                <Text style={styles.cardSubtitle}>Payment method</Text>

                <View style={styles.options}>
                  {PAYMENT_METHODS.map((method) => (
                    <Button
                      key={method}
                      title={method === paymentMethod ? `✓ ${method}` : method}
                      onPress={() => setPaymentMethod(method)}
                      disabled={isSubmitting}
                    />
                  ))}
                </View>

                <Text style={styles.helpText}>
                  {PAYMENT_METHOD_HELP[paymentMethod]}
                </Text>

                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Payment amount</Text>
                  <Text style={styles.totalValue}>
                    {finalTotal !== null && finalTotal > 0
                      ? formatMoney(finalTotal)
                      : "—"}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.cardSubtitle}>Split type</Text>

                <View style={styles.options}>
                  <Button
                    title={
                      splitPaymentVariant === "REGISTER_METHODS"
                        ? "✓ Cash / MB / Glovo cash"
                        : "Cash / MB / Glovo cash"
                    }
                    onPress={() => setSplitPaymentVariant("REGISTER_METHODS")}
                    disabled={isSubmitting}
                  />
                  <Button
                    title={
                      splitPaymentVariant === "GLOVO_ONLINE_ONLY"
                        ? "✓ Glovo online only"
                        : "Glovo online only"
                    }
                    onPress={() => setSplitPaymentVariant("GLOVO_ONLINE_ONLY")}
                    disabled={isSubmitting}
                  />
                </View>

                {splitPaymentVariant === "GLOVO_ONLINE_ONLY" ? (
                  <>
                    <Text style={styles.helpText}>
                      Glovo online is not combined with register payments. The
                      full final total will be assigned to GLOVO_ONLINE.
                    </Text>

                    <View style={styles.totalBox}>
                      <Text style={styles.totalLabel}>GLOVO_ONLINE amount</Text>
                      <Text style={styles.totalValue}>
                        {finalTotal !== null && finalTotal > 0
                          ? formatMoney(finalTotal)
                          : "—"}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.helpText}>
                      Enter the amount received by each method. Leave unused
                      methods empty.
                    </Text>

                    <TextField
                      label="CASH amount"
                      value={splitCashAmount}
                      onChangeText={setSplitCashAmount}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />

                    {splitCashAmount.length > 0 && !splitCash.isValid ? (
                      <Text style={styles.warningText}>
                        CASH amount must be greater than zero or empty.
                      </Text>
                    ) : null}

                    <TextField
                      label="MB amount"
                      value={splitMbAmount}
                      onChangeText={setSplitMbAmount}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />

                    {splitMbAmount.length > 0 && !splitMb.isValid ? (
                      <Text style={styles.warningText}>
                        MB amount must be greater than zero or empty.
                      </Text>
                    ) : null}

                    <TextField
                      label="GLOVO_CASH amount"
                      value={splitGlovoCashAmount}
                      onChangeText={setSplitGlovoCashAmount}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />

                    {splitGlovoCashAmount.length > 0 &&
                    !splitGlovoCash.isValid ? (
                      <Text style={styles.warningText}>
                        GLOVO_CASH amount must be greater than zero or empty.
                      </Text>
                    ) : null}

                    <View style={styles.totalBox}>
                      <Text style={styles.totalLabel}>Split total</Text>
                      <Text style={styles.totalValue}>
                        {formatMoney(splitPaymentTotal)}
                      </Text>
                    </View>

                    <View style={styles.totalBox}>
                      <Text style={styles.totalLabel}>Remaining</Text>
                      <Text style={styles.totalValue}>
                        {splitRemaining !== null
                          ? formatMoney(splitRemaining)
                          : "—"}
                      </Text>
                    </View>

                    {finalTotal !== null &&
                    splitRemaining !== null &&
                    splitRemaining !== 0 ? (
                      <Text style={styles.warningText}>
                        Split payments must match the final total exactly.
                      </Text>
                    ) : null}
                  </>
                )}
              </>
            )}
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
  cardSubtitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  options: {
    gap: 8,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#555555",
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#7a5200",
  },
  totalBox: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 14,
    color: "#555555",
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  actions: {
    gap: 12,
    marginTop: 8,
    paddingBottom: 24,
  },
});