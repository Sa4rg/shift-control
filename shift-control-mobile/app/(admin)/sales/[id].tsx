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
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type { Sale } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { formatMoney } from "@/src/utils/money";
import { colors, fontWeight, fontSize, shadows, radius } from "@/src/theme";

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
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueStyle]}>{value}</Text>
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
  const { user } = useAuth();
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

  const displayName = user?.fullName ?? user?.username ?? "Admin";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (state.status === "loading") {
    return <LoadingState message="Loading sale..." />;
  }

  const appBar = (
    <View style={styles.appBar}>
      <View style={styles.appBarLeft}>
        <Pressable
          style={({ pressed }) => [
            styles.appBarBackButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <Text style={styles.appBarTitle}>Shift Control</Text>
      </View>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    </View>
  );

  if (state.status === "error") {
    return (
      <SafeAreaView style={styles.safeArea}>
        {appBar}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Sale detail</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.sectionTitle}>Could not load sale</Text>
              <ErrorMessage message={state.errorMessage} />

              <Pressable
                style={({ pressed }) => [
                  styles.btnOutline,
                  pressed && styles.buttonPressed,
                ]}
                onPress={loadSale}
              >
                <Text style={styles.btnOutlineText}>Try again</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.btnBack,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => router.back()}
              >
                <Text style={styles.btnBackText}>← Back</Text>
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
    <SafeAreaView style={styles.safeArea}>
      {appBar}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Sale detail</Text>
          <Text style={styles.pageSubtitle}>{formatShortId(sale.id)}</Text>
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

        <View style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.sectionTitle}>Summary</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <StatusBadge
                label={formatLabel(sale.status)}
                tone={isActive ? "primary" : "danger"}
              />
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Invoice status</Text>
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

        <View style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.sectionTitle}>Totals</Text>

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

        <View style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.sectionTitle}>Items</Text>

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

        <View style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.sectionTitle}>Payments</Text>

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

        <View style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.sectionTitle}>Discounts</Text>

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

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.btnRefresh,
              pressed && styles.buttonPressed,
            ]}
            onPress={loadSale}
          >
            <Text style={styles.btnRefreshText}>⟳ Refresh</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.btnBack,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.back()}
          >
            <Text style={styles.btnBackText}>← Back</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
    fontSize: fontSize.base,
    color: colors.textSubtle,
    lineHeight: 20,
  },
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
    gap: 12,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
    letterSpacing: 0.9,
  },
  detailRow: {
    minHeight: 32,
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  detailValue: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: "right",
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
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 4,
  },
  btnRefresh: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: "#89f5e7",
    alignItems: "center",
    justifyContent: "center",
  },
  btnRefreshText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  btnBack: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  btnBackText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  btnOutline: {
    height: 46,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  btnOutlineText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  buttonPressed: {
    opacity: 0.72,
  },
});