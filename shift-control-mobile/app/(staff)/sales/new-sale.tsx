import { router } from "expo-router";
import { useMemo, useState } from "react";
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
import { createSale } from "@/src/api/sales";
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import {
  buildDiscounts,
  calculateDiscountAmount,
  calculateSubtotalFromDrafts,
  parseOptionalPositiveNumber,
  parsePositiveInteger,
  parsePositiveNumber,
  roundMoney,
} from "@/src/features/staff/sales/newSaleCalculations";
import {
  DISCOUNT_HELP,
  DISCOUNT_OPTIONS,
  getDiscountLabel,
  PAYMENT_METHOD_HELP,
  PAYMENT_METHODS,
} from "@/src/features/staff/sales/newSaleOptions";
import type {
  DiscountSelection,
  PaymentMode,
  SaleItemDraft,
  SplitPaymentVariant,
} from "@/src/features/staff/sales/newSaleTypes";
import type { PaymentMethod } from "@/src/types/api";
import { formatMoney } from "@/src/utils/money";

export default function NewSaleScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<SaleItemDraft[]>([
    { productName: "", quantity: "1", unitPrice: "" },
  ]);
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
  const [isDiscountExpanded, setIsDiscountExpanded] = useState(false);

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

  const subtotal = calculateSubtotalFromDrafts(items);

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
    subtotal !== null &&
    isDiscountValid &&
    finalTotal !== null &&
    finalTotal > 0 &&
    isSplitPaymentAmountValid &&
    isSplitPaymentTotalValid &&
    !isSubmitting;

  const displayName = user?.fullName ?? user?.username ?? "Staff";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  function addItem() {
    setItems((prev) => [
      ...prev,
      { productName: "", quantity: "1", unitPrice: "" },
    ]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(
    index: number,
    field: keyof SaleItemDraft,
    value: string
  ) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function handleClearDiscount() {
    setSelectedDiscount("NONE");
    setManualDiscountAmount("");
    setManualDiscountNote("");
    setIsDiscountExpanded(false);
  }

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
    if (!canSubmit || finalTotal === null) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createSale({
        items: items.map((item) => ({
          productName: item.productName.trim(),
          quantity: parsePositiveInteger(item.quantity)!,
          unitPrice: parsePositiveNumber(item.unitPrice)!,
        })),
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
    <SafeAreaView style={styles.safeArea}>
      {/* AppBar */}
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <Text style={styles.menuIcon}>≡</Text>
          <Text style={styles.appBarTitle}>New Sale</Text>
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
          {/* Item details card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Item details</Text>

            {items.map((item, index) => (
              <View key={index}>
                {index > 0 ? <View style={styles.itemSeparator} /> : null}
                <View style={styles.itemBlock}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemLabel}>Item {index + 1}</Text>
                    {items.length > 1 ? (
                      <Pressable
                        onPress={() => removeItem(index)}
                        disabled={isSubmitting}
                      >
                        <Text style={styles.removeItemText}>Remove</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Product name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={item.productName}
                      onChangeText={(v) => updateItem(index, "productName", v)}
                      placeholder="e.g. Premium CBD Oil 10ml"
                      autoCapitalize="sentences"
                      placeholderTextColor="#9aaba8"
                    />
                  </View>

                  <View style={styles.fieldRow}>
                    <View style={[styles.fieldGroup, styles.fieldFlex]}>
                      <Text style={styles.fieldLabel}>Quantity</Text>
                      <TextInput
                        style={styles.textInput}
                        value={item.quantity}
                        onChangeText={(v) => updateItem(index, "quantity", v)}
                        placeholder="1"
                        keyboardType="number-pad"
                        placeholderTextColor="#9aaba8"
                      />
                    </View>
                    <View style={[styles.fieldGroup, styles.fieldFlex]}>
                      <Text style={styles.fieldLabel}>Unit price</Text>
                      <TextInput
                        style={styles.textInput}
                        value={item.unitPrice}
                        onChangeText={(v) => updateItem(index, "unitPrice", v)}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        placeholderTextColor="#9aaba8"
                      />
                    </View>
                  </View>

                  {parsePositiveInteger(item.quantity) !== null &&
                  parsePositiveNumber(item.unitPrice) !== null ? (
                    <Text style={styles.lineTotalText}>
                      Line total:{" "}
                      {formatMoney(
                        roundMoney(
                          parsePositiveInteger(item.quantity)! *
                            parsePositiveNumber(item.unitPrice)!
                        )
                      )}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}

            <Pressable
              style={styles.addItemBtn}
              onPress={addItem}
              disabled={isSubmitting}
            >
              <Text style={styles.addItemBtnText}>+ Add item</Text>
            </Pressable>
          </View>

          {/* Discount card — collapsed by default */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Discount</Text>
              <Pressable
                onPress={() => setIsDiscountExpanded(!isDiscountExpanded)}
              >
                <Text style={styles.actionLink}>
                  {isDiscountExpanded
                    ? "Done"
                    : selectedDiscount === "NONE"
                    ? "Add discount"
                    : "Edit discount"}
                </Text>
              </Pressable>
            </View>

            {!isDiscountExpanded ? (
              selectedDiscount === "NONE" ? (
                <Text style={styles.bodyText}>No discount applied.</Text>
              ) : (
                <View style={styles.discountSummaryRow}>
                  <Text style={styles.bodyText}>
                    {getDiscountLabel(selectedDiscount)}
                  </Text>
                  {discountAmount !== null && discountAmount > 0 ? (
                    <Text style={styles.discountSummaryAmount}>
                      -{formatMoney(discountAmount)}
                    </Text>
                  ) : null}
                </View>
              )
            ) : (
              <>
                <View style={styles.pillRow}>
                  {DISCOUNT_OPTIONS.map((discount) => {
                    const isSelected = discount === selectedDiscount;
                    const isOptionDisabled =
                      isSubmitting ||
                      (discount === "LOYALTY_CARD" &&
                        subtotal !== null &&
                        subtotal < 25);
                    return (
                      <Pressable
                        key={discount}
                        style={[
                          styles.pill,
                          isSelected && styles.pillSelected,
                          isOptionDisabled && styles.pillDisabled,
                        ]}
                        onPress={() => setSelectedDiscount(discount)}
                        disabled={isOptionDisabled}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            isSelected && styles.pillTextSelected,
                            isOptionDisabled && styles.pillTextDisabled,
                          ]}
                        >
                          {getDiscountLabel(discount).toUpperCase()}
                        </Text>
                      </Pressable>
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
                  <View style={styles.manualDiscountBox}>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Discount amount</Text>
                      <TextInput
                        style={styles.textInput}
                        value={manualDiscountAmount}
                        onChangeText={setManualDiscountAmount}
                        placeholder="5.00"
                        keyboardType="decimal-pad"
                        placeholderTextColor="#9aaba8"
                      />
                    </View>

                    {manualDiscountAmount.length > 0 &&
                    manualDiscountAmountNumber === null ? (
                      <Text style={styles.warningText}>
                        Discount amount must be greater than zero.
                      </Text>
                    ) : null}

                    {manualDiscountAmountNumber !== null &&
                    subtotal !== null &&
                    manualDiscountAmountNumber >= subtotal ? (
                      <Text style={styles.warningText}>
                        Manual discount must be lower than subtotal.
                      </Text>
                    ) : null}

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Note</Text>
                      <TextInput
                        style={styles.textInput}
                        value={manualDiscountNote}
                        onChangeText={setManualDiscountNote}
                        placeholder="Reason for discount..."
                        autoCapitalize="sentences"
                        placeholderTextColor="#9aaba8"
                      />
                    </View>

                    {manualDiscountAmount.length > 0 &&
                    manualDiscountNote.trim().length === 0 ? (
                      <Text style={styles.warningText}>
                        Manual discount requires a note.
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {selectedDiscount !== "NONE" ? (
                  <Pressable
                    style={styles.clearDiscountBtn}
                    onPress={handleClearDiscount}
                  >
                    <Text style={styles.clearDiscountText}>Clear discount</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>

          {/* Totals — always visible */}
          <View style={styles.totalsCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                {subtotal !== null ? formatMoney(subtotal) : "—"}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text
                style={[
                  styles.summaryLabel,
                  discountAmount !== null &&
                    discountAmount > 0 &&
                    styles.labelError,
                ]}
              >
                Discount
              </Text>
              <Text
                style={[
                  styles.summaryValue,
                  discountAmount !== null &&
                    discountAmount > 0 &&
                    styles.valueError,
                ]}
              >
                {discountAmount !== null && discountAmount > 0
                  ? `-${formatMoney(discountAmount)}`
                  : "—"}
              </Text>
            </View>

            <View style={[styles.summaryRow, styles.summaryRowFinal]}>
              <Text style={styles.finalLabel}>Final total</Text>
              <Text style={styles.finalValue}>
                {finalTotal !== null ? formatMoney(finalTotal) : "—"}
              </Text>
            </View>

            {finalTotal !== null && finalTotal <= 0 ? (
              <Text style={styles.warningText}>
                Final total must be greater than zero.
              </Text>
            ) : null}
          </View>

          {/* Payment method card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment method</Text>

            {/* Segmented control */}
            <View style={styles.segmentedControl}>
              <Pressable
                style={[
                  styles.segmentBtn,
                  paymentMode === "SINGLE" && styles.segmentBtnActive,
                ]}
                onPress={() => setPaymentMode("SINGLE")}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    paymentMode === "SINGLE" && styles.segmentBtnTextActive,
                  ]}
                >
                  Single
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segmentBtn,
                  paymentMode === "SPLIT" && styles.segmentBtnActive,
                ]}
                onPress={() => setPaymentMode("SPLIT")}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    paymentMode === "SPLIT" && styles.segmentBtnTextActive,
                  ]}
                >
                  Split
                </Text>
              </Pressable>
            </View>

            {paymentMode === "SINGLE" ? (
              <>
                <View style={styles.methodGrid}>
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = method === paymentMethod;
                    return (
                      <Pressable
                        key={method}
                        style={[
                          styles.methodBtn,
                          isSelected && styles.methodBtnSelected,
                        ]}
                        onPress={() => setPaymentMethod(method)}
                        disabled={isSubmitting}
                      >
                        <Text
                          style={[
                            styles.methodBtnText,
                            isSelected && styles.methodBtnTextSelected,
                          ]}
                        >
                          {method}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.helpText}>
                  {PAYMENT_METHOD_HELP[paymentMethod]}
                </Text>

                <View style={styles.paymentAmountRow}>
                  <Text style={styles.summaryLabel}>Payment amount</Text>
                  <Text style={styles.summaryValue}>
                    {finalTotal !== null && finalTotal > 0
                      ? formatMoney(finalTotal)
                      : "—"}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.pillRow}>
                  <Pressable
                    style={[
                      styles.pill,
                      splitPaymentVariant === "REGISTER_METHODS" &&
                        styles.pillSelected,
                    ]}
                    onPress={() => setSplitPaymentVariant("REGISTER_METHODS")}
                    disabled={isSubmitting}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        splitPaymentVariant === "REGISTER_METHODS" &&
                          styles.pillTextSelected,
                      ]}
                    >
                      CASH / MB / GLOVO CASH
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.pill,
                      splitPaymentVariant === "GLOVO_ONLINE_ONLY" &&
                        styles.pillSelected,
                    ]}
                    onPress={() => setSplitPaymentVariant("GLOVO_ONLINE_ONLY")}
                    disabled={isSubmitting}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        splitPaymentVariant === "GLOVO_ONLINE_ONLY" &&
                          styles.pillTextSelected,
                      ]}
                    >
                      GLOVO ONLINE ONLY
                    </Text>
                  </Pressable>
                </View>

                {splitPaymentVariant === "GLOVO_ONLINE_ONLY" ? (
                  <>
                    <Text style={styles.helpText}>
                      Glovo online is not combined with register payments. The
                      full final total will be assigned to GLOVO_ONLINE.
                    </Text>

                    <View style={styles.paymentAmountRow}>
                      <Text style={styles.summaryLabel}>
                        GLOVO_ONLINE amount
                      </Text>
                      <Text style={styles.summaryValue}>
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

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>CASH amount</Text>
                      <TextInput
                        style={styles.textInput}
                        value={splitCashAmount}
                        onChangeText={setSplitCashAmount}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        placeholderTextColor="#9aaba8"
                      />
                    </View>

                    {splitCashAmount.length > 0 && !splitCash.isValid ? (
                      <Text style={styles.warningText}>
                        CASH amount must be greater than zero or empty.
                      </Text>
                    ) : null}

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>MB amount</Text>
                      <TextInput
                        style={styles.textInput}
                        value={splitMbAmount}
                        onChangeText={setSplitMbAmount}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        placeholderTextColor="#9aaba8"
                      />
                    </View>

                    {splitMbAmount.length > 0 && !splitMb.isValid ? (
                      <Text style={styles.warningText}>
                        MB amount must be greater than zero or empty.
                      </Text>
                    ) : null}

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>GLOVO_CASH amount</Text>
                      <TextInput
                        style={styles.textInput}
                        value={splitGlovoCashAmount}
                        onChangeText={setSplitGlovoCashAmount}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        placeholderTextColor="#9aaba8"
                      />
                    </View>

                    {splitGlovoCashAmount.length > 0 &&
                    !splitGlovoCash.isValid ? (
                      <Text style={styles.warningText}>
                        GLOVO_CASH amount must be greater than zero or empty.
                      </Text>
                    ) : null}

                    <View style={styles.paymentAmountRow}>
                      <Text style={styles.summaryLabel}>Split total</Text>
                      <Text style={styles.summaryValue}>
                        {formatMoney(splitPaymentTotal)}
                      </Text>
                    </View>

                    <View style={styles.paymentAmountRow}>
                      <Text style={styles.summaryLabel}>Remaining</Text>
                      <Text style={styles.summaryValue}>
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

          {/* Notes card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              value={note}
              onChangeText={setNote}
              placeholder="Add internal sale notes here..."
              autoCapitalize="sentences"
              multiline
              numberOfLines={3}
              placeholderTextColor="#9aaba8"
              textAlignVertical="top"
            />
          </View>

          <ErrorMessage message={errorMessage} />

          {/* Bottom actions */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.btnPrimary, !canSubmit && styles.btnDisabled]}
              onPress={() => void handleSubmit()}
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Create sale</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.cancelBtn}
              onPress={() => router.back()}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
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

  // AppBar
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
    gap: 16,
  },
  menuIcon: {
    fontSize: 20,
    color: "#00685f",
  },
  appBarTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#00685f",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#708cfd",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00217a",
  },

  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  // Card
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bcc9c6",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#131b2e",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Form fields
  fieldGroup: {
    gap: 4,
  },
  fieldFlex: {
    flex: 1,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3d4947",
    letterSpacing: 0.3,
  },
  textInput: {
    height: 48,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#d8e0dd",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#131b2e",
  },
  notesInput: {
    height: 80,
    paddingTop: 12,
    paddingBottom: 12,
  },

  // Multi-item rows
  itemBlock: {
    gap: 12,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3d4947",
    letterSpacing: 0.3,
  },
  removeItemText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ba1a1a",
  },
  lineTotalText: {
    fontSize: 12,
    color: "#3d4947",
  },
  itemSeparator: {
    height: 1,
    backgroundColor: "#eaedff",
    marginBottom: 4,
  },
  addItemBtn: {
    alignSelf: "flex-start",
    paddingTop: 4,
  },
  addItemBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00685f",
  },

  // Discount collapsed summary
  bodyText: {
    fontSize: 14,
    color: "#3d4947",
    lineHeight: 20,
  },
  actionLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00685f",
  },
  discountSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  discountSummaryAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ba1a1a",
  },

  // Pill buttons (discount options, split type)
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "#bcc9c6",
    backgroundColor: "#ffffff",
  },
  pillSelected: {
    backgroundColor: "#00685f",
    borderColor: "#00685f",
  },
  pillDisabled: {
    opacity: 0.4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#131b2e",
    letterSpacing: 0.3,
  },
  pillTextSelected: {
    color: "#ffffff",
  },
  pillTextDisabled: {
    color: "#9aaba8",
  },

  helpText: {
    fontSize: 14,
    color: "#3d4947",
    lineHeight: 20,
  },
  warningText: {
    fontSize: 13,
    color: "#825100",
    lineHeight: 18,
  },

  // Manual discount expanded area
  manualDiscountBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(188,201,198,0.3)",
  },

  // Clear discount
  clearDiscountBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#fff0f0",
  },
  clearDiscountText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ba1a1a",
  },

  // Totals card
  totalsCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bcc9c6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
  },
  summaryRowFinal: {
    borderBottomWidth: 0,
    paddingVertical: 14,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#3d4947",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 14,
    color: "#131b2e",
    fontWeight: "500",
  },
  labelError: {
    color: "#ba1a1a",
  },
  valueError: {
    color: "#ba1a1a",
  },
  finalLabel: {
    fontSize: 20,
    fontWeight: "600",
    color: "#131b2e",
  },
  finalValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#00685f",
  },

  // Payment segmented control
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#f2f3ff",
    borderRadius: 10,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#3d4947",
  },
  segmentBtnTextActive: {
    fontWeight: "600",
    color: "#131b2e",
  },

  // Payment method grid (2×2)
  methodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  methodBtn: {
    width: "47%",
    height: 56,
    borderWidth: 1,
    borderColor: "#bcc9c6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  methodBtnSelected: {
    borderWidth: 2,
    borderColor: "#00685f",
    backgroundColor: "rgba(0,104,95,0.05)",
  },
  methodBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3d4947",
  },
  methodBtnTextSelected: {
    color: "#00685f",
  },

  // Payment amount display row
  paymentAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(226,231,255,0.3)",
    borderRadius: 8,
    padding: 12,
  },

  // Actions
  actions: {
    gap: 12,
    paddingBottom: 40,
  },
  btnPrimary: {
    height: 48,
    backgroundColor: "#00685f",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00685f",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6d7a77",
  },
});