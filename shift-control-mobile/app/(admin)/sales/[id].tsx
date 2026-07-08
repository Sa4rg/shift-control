import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { getSaleById } from "@/src/api/sales";
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type { Sale } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { formatMoney } from "@/src/utils/money";
import { colors, commonStyles, fontWeight, fontSize, radius } from "@/src/theme";

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

function formatShortId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function DetailRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string | null;
  valueStyle?: object;
}) {
  if (!value) {
    return null;
  }

  return (
    <View style={commonStyles.detailRow}>
      <Text style={commonStyles.detailLabel}>{label}</Text>
      <Text style={[commonStyles.detailValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "primary" | "neutral" | "danger" | "warning";
}) {
  return (
    <View
      style={[
        styles.badge,
        tone === "primary" && styles.badgePrimary,
        tone === "neutral" && styles.badgeNeutral,
        tone === "danger" && styles.badgeDanger,
        tone === "warning" && styles.badgeWarning,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          tone === "primary" && styles.badgeTextPrimary,
          tone === "neutral" && styles.badgeTextNeutral,
          tone === "danger" && styles.badgeTextDanger,
          tone === "warning" && styles.badgeTextWarning,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function PaymentMethodBadge({ method }: { method: string }) {
  return (
    <View style={styles.paymentBadge}>
      <Text style={styles.paymentBadgeText}>{formatLabel(method)}</Text>
    </View>
  );
}

export default function AdminSaleDetailScreen() {

  const params = useLocalSearchParams<{ id?: string }>();
  const saleId = params.id;

  const [state, setState] = useState<SaleDetailState>({
    status: "loading",
    sale: null,
    errorMessage: null,
  });

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

  useEffect(() => {
    void loadSale();
  }, [loadSale]);


  if (state.status === "loading") {
    return <LoadingState message="Loading sale..." />;
  }

  if (state.status === "error") {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <ScrollView
          contentContainerStyle={commonStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={commonStyles.pageHeader}>
            <Text style={commonStyles.pageTitle}>Sale detail</Text>
          </View>

          <View style={commonStyles.card}>
            <View style={commonStyles.cardBody}>
              <Text style={commonStyles.sectionTitle}>Could not load sale</Text>
              <ErrorMessage message={state.errorMessage} />

              <Pressable
                style={({ pressed }) => [
                  commonStyles.outlineButton,
                  pressed && commonStyles.buttonPressed,
                ]}
                onPress={loadSale}
              >
                <Text style={commonStyles.outlineButtonText}>Try again</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  commonStyles.btnBack,
                  pressed && commonStyles.buttonPressed,
                ]}
                onPress={() => router.back()}
              >
                <Text style={commonStyles.btnBackText}>← Back</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const sale = state.sale;
  const isActive = sale.status === "ACTIVE";
  const hasDiscount = sale.discountTotalAmount > 0;

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <AppTopBar variant="back" />

      <ScrollView
        contentContainerStyle={commonStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={commonStyles.pageHeader}>
          <Text style={commonStyles.pageTitle}>Sale detail</Text>
          <Text style={commonStyles.pageSubtitle}>{formatShortId(sale.id)}</Text>
        </View>

        <View
          style={[
            styles.statusBanner,
            isActive ? styles.statusBannerActive : styles.statusBannerCancelled,
          ]}
        >
          <View style={styles.statusBannerLeft}>
            <View
              style={[
                styles.statusDot,
                isActive ? styles.statusDotActive : styles.statusDotCancelled,
              ]}
            />
            <Text
              style={[
                styles.statusBannerText,
                isActive
                  ? styles.statusBannerTextActive
                  : styles.statusBannerTextCancelled,
              ]}
            >
              {isActive ? "ACTIVE STATUS" : "CANCELLED STATUS"}
            </Text>
          </View>

          <Text
            style={[
              styles.statusBannerValue,
              isActive
                ? styles.statusBannerTextActive
                : styles.statusBannerTextCancelled,
            ]}
          >
            {isActive ? "VERIFIED" : "EXCLUDED"}
          </Text>
        </View>

        <View style={commonStyles.card}>
          <View style={commonStyles.cardBody}>
            <Text style={commonStyles.sectionTitle}>Summary</Text>

            <View style={commonStyles.detailRow}>
              <Text style={commonStyles.detailLabel}>Status</Text>
              <StatusBadge
                label={formatLabel(sale.status)}
                tone={isActive ? "primary" : "danger"}
              />
            </View>

            <View style={commonStyles.detailRow}>
              <Text style={commonStyles.detailLabel}>Invoice status</Text>
              <StatusBadge
                label={formatLabel(sale.invoiceStatus)}
                tone={sale.invoiceStatus === "INVOICED" ? "primary" : "neutral"}
              />
            </View>

            <DetailRow label="Staff name" value={sale.staffName} />
            <DetailRow label="Store name" value={sale.storeName} />
            <DetailRow label="Created at" value={formatDateTime(sale.createdAt)} />
            <DetailRow label="Updated at" value={formatDateTime(sale.updatedAt)} />

            {sale.cancelledAt ? (
              <DetailRow
                label="Cancelled at"
                value={formatDateTime(sale.cancelledAt)}
                valueStyle={styles.dangerValue}
              />
            ) : null}

            {sale.cancelledReason ? (
              <DetailRow label="Cancel reason" value={sale.cancelledReason} />
            ) : null}

            {sale.note ? (
              <View style={styles.notePreview}>
                <Text style={styles.noteLabel}>Note</Text>
                <Text style={styles.noteText}>“{sale.note}”</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={commonStyles.card}>
          <View style={commonStyles.cardBody}>
            <Text style={commonStyles.sectionTitle}>Totals</Text>

            <DetailRow
              label="Subtotal"
              value={formatMoney(sale.subtotalAmount)}
            />

            <DetailRow
              label="Discount total"
              value={
                hasDiscount
                  ? `-${formatMoney(sale.discountTotalAmount)}`
                  : formatMoney(0)
              }
              valueStyle={hasDiscount ? styles.dangerValue : undefined}
            />

            <View style={styles.finalTotalRow}>
              <Text style={styles.finalTotalLabel}>Final total</Text>
              <Text
                style={[
                  styles.finalTotalValue,
                  !isActive && styles.cancelledAmount,
                ]}
              >
                {formatMoney(sale.finalTotalAmount)}
              </Text>
            </View>
          </View>
        </View>

        <View style={commonStyles.card}>
          <View style={commonStyles.cardBody}>
            <Text style={commonStyles.sectionTitle}>Items</Text>

            {sale.items.length === 0 ? (
              <Text style={styles.bodyText}>No items registered.</Text>
            ) : (
              <View style={styles.list}>
                {sale.items.map((item, index) => (
                  <View
                    key={item.id}
                    style={[
                      styles.listRow,
                      index === sale.items.length - 1 && styles.listRowLast,
                    ]}
                  >
                    <View style={styles.rowMain}>
                      <Text style={styles.rowTitle}>{item.productName}</Text>
                      <Text style={styles.rowMeta}>
                        {item.quantity} × {formatMoney(item.unitPrice)}
                      </Text>
                    </View>

                    <Text style={styles.rowAmount}>
                      {formatMoney(item.lineTotal)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={commonStyles.card}>
          <View style={commonStyles.cardBody}>
            <Text style={commonStyles.sectionTitle}>Payments</Text>

            {sale.payments.length === 0 ? (
              <Text style={styles.bodyText}>No payments registered.</Text>
            ) : (
              <View style={styles.list}>
                {sale.payments.map((payment, index) => (
                  <View
                    key={payment.id}
                    style={[
                      styles.listRow,
                      index === sale.payments.length - 1 && styles.listRowLast,
                    ]}
                  >
                    <View style={styles.paymentMain}>
                      <PaymentMethodBadge method={payment.method} />
                    </View>

                    <Text style={styles.rowAmount}>
                      {formatMoney(payment.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={commonStyles.card}>
          <View style={commonStyles.cardBody}>
            <Text style={commonStyles.sectionTitle}>Discounts</Text>

            {sale.discounts.length === 0 ? (
              <Text style={styles.bodyText}>No discounts applied.</Text>
            ) : (
              <View style={styles.list}>
                {sale.discounts.map((discount, index) => (
                  <View
                    key={discount.id}
                    style={[
                      styles.listRow,
                      index === sale.discounts.length - 1 &&
                        styles.listRowLast,
                    ]}
                  >
                    <View style={styles.rowMain}>
                      <Text style={styles.rowTitle}>{discount.reason}</Text>
                      <Text style={styles.rowMeta}>
                        {formatLabel(discount.type)} · Value{" "}
                        {formatMoney(discount.value)}
                      </Text>

                      {discount.note ? (
                        <Text style={styles.rowMeta}>{discount.note}</Text>
                      ) : null}
                    </View>

                    <Text style={styles.discountAmount}>
                      -{formatMoney(discount.amountApplied)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={commonStyles.actions}>
          <Pressable
            style={({ pressed }) => [
              commonStyles.btnRefresh,
              pressed && commonStyles.buttonPressed,
            ]}
            onPress={loadSale}
          >
            <Text style={commonStyles.btnRefreshText}>⟳ Refresh</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              commonStyles.btnBack,
              pressed && commonStyles.buttonPressed,
            ]}
            onPress={() => router.back()}
          >
            <Text style={commonStyles.btnBackText}>← Back</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  statusBanner: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  statusBannerActive: {
    backgroundColor: colors.primarySoft,
    borderColor: "#b9ddd8",
  },
  statusBannerCancelled: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
  },
  statusBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotActive: {
    backgroundColor: colors.primary,
  },
  statusDotCancelled: {
    backgroundColor: "#825100",
  },
  statusBannerText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1,
  },
  statusBannerValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.7,
  },
  statusBannerTextActive: {
    color: colors.primary,
  },
  statusBannerTextCancelled: {
    color: colors.warning,
  },

  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgePrimary: {
    backgroundColor: colors.primary,
  },
  badgeNeutral: {
    backgroundColor: colors.secondarySoft,
  },
  badgeDanger: {
    backgroundColor: colors.dangerSoft,
  },
  badgeWarning: {
    backgroundColor: colors.warningSoft,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
  },
  badgeTextPrimary: {
    color: colors.surface,
  },
  badgeTextNeutral: {
    color: "#173bab",
  },
  badgeTextDanger: {
    color: "#93000a",
  },
  badgeTextWarning: {
    color: colors.warning,
  },
  notePreview: {
    gap: 5,
    paddingTop: 2,
  },
  noteLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSubtle,
  },
  noteText: {
    fontSize: fontSize.lg,
    lineHeight: 22,
    color: colors.text,
    fontStyle: "italic",
  },
  finalTotalRow: {
    minHeight: 46,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  finalTotalLabel: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  finalTotalValue: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  list: {
    gap: 0,
  },
  listRow: {
    minHeight: 58,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  rowMain: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  rowMeta: {
    fontSize: fontSize.sm,
    lineHeight: 17,
    color: colors.textMuted,
  },
  rowAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: "right",
  },
  discountAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.danger,
    textAlign: "right",
  },
  dangerValue: {
    color: colors.danger,
  },
  cancelledAmount: {
    color: colors.textSubtle,
    textDecorationLine: "line-through",
  },
  paymentMain: {
    flex: 1,
    alignItems: "flex-start",
  },
  paymentBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.secondarySoft,
  },
  paymentBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: "#173bab",
  },
  bodyText: {
    fontSize: fontSize.base,
    lineHeight: 20,
    color: colors.textMuted,
  },
});