import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { cancelSale, getSaleById, markSaleAsInvoiced } from "@/src/api/sales";
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { colors, fontWeight, fontSize, shadows, radius } from "@/src/theme";
import { LoadingState } from "@/src/components/LoadingState";
import type { Sale } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { formatMoney } from "@/src/utils/money";

function getDiscountLabel(reason: string): string {
  switch (reason) {
    case "LOYALTY_CARD":
      return "Loyalty card";
    case "VOUCHER_10_PERCENT":
      return "Voucher 10%";
    case "MANUAL_DISCOUNT":
      return "Manual discount";
    default:
      return reason;
  }
}


type SaleDetailState =
  | {
      status: "loading";
      sale: null;
      errorMessage: null;
    }
  | {
      status: "ready";
      sale: Sale;
      errorMessage: null;
    }
  | {
      status: "error";
      sale: null;
      errorMessage: string;
    };

export default function SaleDetailScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const saleId = params.id;

  const [state, setState] = useState<SaleDetailState>({
    status: "loading",
    sale: null,
    errorMessage: null,
  });

  const [invoiceErrorMessage, setInvoiceErrorMessage] = useState<string | null>(
    null
  );

  const [isMarkingInvoiced, setIsMarkingInvoiced] = useState(false);

  const [cancelReason, setCancelReason] = useState("");
  const [cancelErrorMessage, setCancelErrorMessage] = useState<string | null>(
    null
  );
  const [isCancelling, setIsCancelling] = useState(false);

  const loadSale = useCallback(async () => {
    if (!saleId) {
      setState({
        status: "error",
        sale: null,
        errorMessage: "Sale id is missing.",
      });
      return;
    }

    setState({
      status: "loading",
      sale: null,
      errorMessage: null,
    });

    try {
      const sale = await getSaleById(saleId);

      setState({
        status: "ready",
        sale,
        errorMessage: null,
      });
    } catch (error) {
      setState({
        status: "error",
        sale: null,
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, [saleId]);

  async function handleMarkAsInvoiced() {
    if (!saleId || state.status !== "ready" || isMarkingInvoiced) {
        return;
    }

    setIsMarkingInvoiced(true);
    setInvoiceErrorMessage(null);

    try {
        const updatedSale = await markSaleAsInvoiced(saleId);

        setState({
        status: "ready",
        sale: updatedSale,
        errorMessage: null,
        });
    } catch (error) {
        setInvoiceErrorMessage(getApiErrorMessage(error));
    } finally {
        setIsMarkingInvoiced(false);
    }
  }

  async function handleCancelSale() {
    if (
      !saleId ||
      state.status !== "ready" ||
      isCancelling ||
      cancelReason.trim().length === 0
    ) {
      return;
    }

    setIsCancelling(true);
    setCancelErrorMessage(null);

    try {
      const updatedSale = await cancelSale(saleId, {
        reason: cancelReason.trim(),
      });

      setState({
        status: "ready",
        sale: updatedSale,
        errorMessage: null,
      });
      setCancelReason("");
    } catch (error) {
      setCancelErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsCancelling(false);
    }
  }

  useEffect(() => {
    void loadSale();
  }, [loadSale]);

  if (state.status === "loading") {
    return <LoadingState message="Loading sale..." />;
  }

  const displayName = user?.fullName ?? user?.username ?? "Staff";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (state.status === "error") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.appBar}>
          <View style={styles.appBarLeft}>
            <Text style={styles.menuIcon}>≡</Text>
            <Text style={styles.appBarTitle}>Shift Control</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Sale detail</Text>
          </View>
          <View style={styles.card}>
            <ErrorMessage message={state.errorMessage} />
            <Pressable
              style={styles.btnPrimary}
              onPress={() => void loadSale()}
            >
              <Text style={styles.btnPrimaryText}>Try again</Text>
            </Pressable>
            <Pressable style={styles.btnBack} onPress={() => router.back()}>
              <Text style={styles.btnBackText}>Back</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const sale = state.sale;

  const canMarkAsInvoiced =
    sale.status === "ACTIVE" && sale.invoiceStatus === "PENDING";

  const canCancelSale = sale.status === "ACTIVE";

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* AppBar */}
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <Text style={styles.menuIcon}>≡</Text>
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
          {/* Page header */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Sale detail</Text>
            <Text style={styles.pageSubtitle}>
              #{sale.id.slice(0, 8).toUpperCase()}
            </Text>
          </View>

          {/* Summary card */}
          <View style={styles.card}>
            <View style={styles.summaryTopRow}>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.badge,
                    sale.status === "ACTIVE"
                      ? styles.badgeActive
                      : styles.badgeCancelled,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      sale.status === "ACTIVE"
                        ? styles.badgeActiveText
                        : styles.badgeCancelledText,
                    ]}
                  >
                    {sale.status}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    sale.invoiceStatus === "INVOICED"
                      ? styles.badgeInvoiced
                      : styles.badgePending,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      sale.invoiceStatus === "INVOICED"
                        ? styles.badgeInvoicedText
                        : styles.badgePendingText,
                    ]}
                  >
                    {sale.invoiceStatus}
                  </Text>
                </View>
              </View>
              <Text style={styles.dateText}>{formatDateTime(sale.createdAt)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalsSection}>
              <View style={styles.moneyRow}>
                <Text style={styles.moneyLabel}>Subtotal</Text>
                <Text style={styles.moneyValue}>
                  {formatMoney(sale.subtotalAmount)}
                </Text>
              </View>
              <View style={styles.moneyRow}>
                <Text style={styles.moneyLabel}>Discount</Text>
                <Text
                  style={[
                    styles.moneyValue,
                    sale.discountTotalAmount > 0 && styles.moneyError,
                  ]}
                >
                  {sale.discountTotalAmount > 0
                    ? `-${formatMoney(sale.discountTotalAmount)}`
                    : "—"}
                </Text>
              </View>
              <View style={[styles.moneyRow, styles.moneyRowFinal]}>
                <Text style={styles.finalLabel}>Final total</Text>
                <Text style={styles.finalValue}>
                  {formatMoney(sale.finalTotalAmount)}
                </Text>
              </View>
            </View>

            {sale.status === "CANCELLED" && sale.cancelledAt ? (
              <View style={styles.cancelledInfo}>
                <Text style={styles.cancelledInfoText}>
                  Cancelled on {formatDateTime(sale.cancelledAt)}
                </Text>
                {sale.cancelledReason ? (
                  <Text style={styles.cancelledInfoText}>
                    Reason: {sale.cancelledReason}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Items card */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>ITEMS</Text>
            <View style={styles.listContainer}>
              {sale.items.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.listRow,
                    index > 0 && styles.listRowWithDivider,
                  ]}
                >
                  <View style={styles.listRowMain}>
                    <Text style={styles.listRowTitle}>{item.productName}</Text>
                    <Text style={styles.listRowMeta}>
                      {item.quantity} × {formatMoney(item.unitPrice)}
                    </Text>
                  </View>
                  <Text style={styles.listRowAmount}>
                    {formatMoney(item.lineTotal)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Discounts card */}
          {sale.discounts.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>DISCOUNTS</Text>
              <View style={styles.listContainer}>
                {sale.discounts.map((discount, index) => (
                  <View
                    key={discount.id}
                    style={[
                      styles.listRow,
                      index > 0 && styles.listRowWithDivider,
                    ]}
                  >
                    <View style={styles.listRowMain}>
                      <Text style={styles.listRowTitle}>
                        {getDiscountLabel(discount.reason)}
                      </Text>
                      {discount.note ? (
                        <Text style={styles.listRowMeta}>{discount.note}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.discountAmount}>
                      -{formatMoney(discount.amountApplied)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Payments card */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>PAYMENTS</Text>
            <View style={styles.listContainer}>
              {sale.payments.map((payment, index) => (
                <View
                  key={payment.id}
                  style={[
                    styles.listRow,
                    index > 0 && styles.listRowWithDivider,
                  ]}
                >
                  <View style={styles.methodChipRow}>
                    <View style={styles.methodChip}>
                      <Text style={styles.methodChipText}>
                        {payment.method}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.listRowAmount}>
                    {formatMoney(payment.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Invoice action card */}
          <View style={styles.card}>
            {sale.invoiceStatus === "INVOICED" ? (
              <Text style={styles.bodyText}>
                This sale is already invoiced.
              </Text>
            ) : null}

            {sale.status === "CANCELLED" ? (
              <Text style={styles.bodyText}>
                Cancelled sales cannot be invoiced.
              </Text>
            ) : null}

            {canMarkAsInvoiced ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>ⓘ</Text>
                  <Text style={styles.infoText}>
                    This sale has not been invoiced yet.
                  </Text>
                </View>
                <ErrorMessage message={invoiceErrorMessage} />
                <Pressable
                  style={[
                    styles.btnPrimary,
                    isMarkingInvoiced && styles.btnDisabled,
                  ]}
                  onPress={() => void handleMarkAsInvoiced()}
                  disabled={isMarkingInvoiced}
                >
                  {isMarkingInvoiced ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Mark as invoiced</Text>
                  )}
                </Pressable>
              </>
            ) : null}
          </View>

          {/* Cancel sale card */}
          <View style={styles.card}>
            {sale.status === "CANCELLED" ? (
              <>
                <Text style={styles.bodyText}>
                  This sale is already cancelled.
                </Text>
                {sale.cancelledReason ? (
                  <Text style={styles.cancelledReasonText}>
                    Reason: {sale.cancelledReason}
                  </Text>
                ) : null}
              </>
            ) : null}

            {canCancelSale ? (
              <>
                {sale.invoiceStatus === "INVOICED" ? (
                  <Text style={styles.warningText}>
                    This sale is already invoiced. Cancelling it here will not
                    cancel the invoice. Please handle the invoice correction
                    outside Shift Control and record the reason clearly.
                  </Text>
                ) : null}

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Cancellation reason...</Text>
                  <TextInput
                    style={styles.textInput}
                    value={cancelReason}
                    onChangeText={setCancelReason}
                    placeholder="Type reason here"
                    autoCapitalize="sentences"
                    placeholderTextColor="#9aaba8"
                  />
                </View>

                <ErrorMessage message={cancelErrorMessage} />

                <Pressable
                  style={[
                    styles.btnDanger,
                    (cancelReason.trim().length === 0 || isCancelling) &&
                      styles.btnDisabled,
                  ]}
                  onPress={() => void handleCancelSale()}
                  disabled={cancelReason.trim().length === 0 || isCancelling}
                >
                  {isCancelling ? (
                    <ActivityIndicator color="#ba1a1a" />
                  ) : (
                    <Text style={styles.btnDangerText}>Cancel sale</Text>
                  )}
                </Pressable>
              </>
            ) : null}
          </View>

          {/* Note card */}
          {sale.note ? (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>NOTE</Text>
              <Text style={styles.bodyText}>{sale.note}</Text>
            </View>
          ) : null}

          {/* Bottom actions */}
          <View style={styles.bottomActions}>
            <Pressable
              style={styles.btnRefresh}
              onPress={() => void loadSale()}
            >
              <Text style={styles.btnRefreshText}>Refresh</Text>
            </Pressable>
            <Pressable style={styles.btnBack} onPress={() => router.back()}>
              <Text style={styles.btnBackText}>Back</Text>
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

  // AppBar
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
    gap: 16,
  },
  menuIcon: {
    fontSize: 20,
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

  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },

  // Page header
  pageHeader: {
    gap: 4,
    paddingHorizontal: 4,
  },
  pageTitle: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 16,
    gap: 12,
    ...shadows.card,
  },

  // Summary card — top row
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.3,
  },
  badgeActive: {
    backgroundColor: colors.primaryMuted,
  },
  badgeActiveText: {
    color: "#004f49",
  },
  badgeCancelled: {
    backgroundColor: "#e8ecf0",
  },
  badgeCancelledText: {
    color: "#4d5b5a",
  },
  badgePending: {
    backgroundColor: "#fff3d6",
  },
  badgePendingText: {
    color: colors.warning,
  },
  badgeInvoiced: {
    backgroundColor: "#e8eeff",
  },
  badgeInvoicedText: {
    color: colors.secondary,
  },
  dateText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
  },

  // Totals
  totalsSection: {
    gap: 8,
  },
  moneyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  moneyLabel: {
    fontSize: fontSize.xl,
    color: colors.textMuted,
  },
  moneyValue: {
    fontSize: fontSize.xl,
    color: colors.text,
  },
  moneyError: {
    color: colors.danger,
  },
  moneyRowFinal: {
    paddingTop: 4,
  },
  finalLabel: {
    fontSize: 20,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  finalValue: {
    fontSize: 20,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },

  // Cancelled info block
  cancelledInfo: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: 12,
    gap: 4,
  },
  cancelledInfoText: {
    fontSize: fontSize.md,
    color: "#4d5b5a",
  },

  // Section label (ITEMS, PAYMENTS, etc.)
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extrabold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },

  // List rows inside cards
  listContainer: {
    gap: 0,
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  listRowWithDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  listRowMain: {
    flex: 1,
    gap: 4,
    paddingRight: 12,
  },
  listRowTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  listRowMeta: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  listRowAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },

  // Discounts
  discountAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.danger,
  },

  // Payments method chip
  methodChipRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  methodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#e2e7ff",
    borderRadius: radius.sm,
  },
  methodChipText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },

  // Invoice action info row
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  infoIcon: {
    fontSize: fontSize.xxl,
    color: colors.warning,
    lineHeight: 22,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.xl,
    color: colors.textMuted,
    lineHeight: 22,
  },

  // Text styles
  bodyText: {
    fontSize: fontSize.xl,
    color: colors.textMuted,
    lineHeight: 22,
  },
  warningText: {
    fontSize: fontSize.base,
    color: colors.warning,
    lineHeight: 20,
  },
  cancelledReasonText: {
    fontSize: fontSize.base,
    color: "#4d5b5a",
    lineHeight: 20,
  },

  // Cancel reason form
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  textInput: {
    height: 48,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    fontSize: fontSize.xl,
    color: colors.text,
  },

  // Buttons
  btnPrimary: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primaryButton,
  },
  btnPrimaryText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.extrabold,
    color: colors.surface,
    letterSpacing: 0.05,
  },
  btnDanger: {
    height: 48,
    borderWidth: 2,
    borderColor: colors.danger,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDangerText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.danger,
    letterSpacing: 0.05,
  },
  btnDisabled: {
    opacity: 0.5,
  },

  // Bottom actions
  bottomActions: {
    gap: 12,
    paddingBottom: 24,
  },
  btnRefresh: {
    height: 48,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRefreshText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.secondary,
  },
  btnBack: {
    height: 48,
    borderWidth: 1,
    borderColor: "#6d7a77",
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnBackText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
});