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
    backgroundColor: "#faf8ff",
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
    fontSize: 14,
    color: "#6d7a77",
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
    backgroundColor: "#edf8f6",
    borderColor: "#b9ddd8",
  },
  statusBannerCancelled: {
    backgroundColor: "#fff8e6",
    borderColor: "#f0d8a0",
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
    backgroundColor: "#00685f",
  },
  statusDotCancelled: {
    backgroundColor: "#825100",
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  statusBannerValue: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  statusBannerTextActive: {
    color: "#00685f",
  },
  statusBannerTextCancelled: {
    color: "#825100",
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
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#00685f",
    letterSpacing: 0.8,
  },
  detailRow: {
    minHeight: 32,
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#3d4947",
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#131b2e",
    textAlign: "right",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgePrimary: {
    backgroundColor: "#00685f",
  },
  badgeNeutral: {
    backgroundColor: "#dde1ff",
  },
  badgeDanger: {
    backgroundColor: "#ffdad6",
  },
  badgeWarning: {
    backgroundColor: "#fff8e6",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  badgeTextPrimary: {
    color: "#ffffff",
  },
  badgeTextNeutral: {
    color: "#173bab",
  },
  badgeTextDanger: {
    color: "#93000a",
  },
  badgeTextWarning: {
    color: "#825100",
  },
  notePreview: {
    gap: 5,
    paddingTop: 2,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6d7a77",
  },
  noteText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#131b2e",
    fontStyle: "italic",
  },
  finalTotalRow: {
    minHeight: 46,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eaedff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  finalTotalLabel: {
    fontSize: 16,
    fontWeight: "900",
    color: "#131b2e",
  },
  finalTotalValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#00685f",
  },
  list: {
    gap: 0,
  },
  listRow: {
    minHeight: 58,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
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
    fontSize: 15,
    fontWeight: "900",
    color: "#131b2e",
  },
  rowMeta: {
    fontSize: 12,
    lineHeight: 17,
    color: "#3d4947",
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: "900",
    color: "#131b2e",
    textAlign: "right",
  },
  discountAmount: {
    fontSize: 15,
    fontWeight: "900",
    color: "#ba1a1a",
    textAlign: "right",
  },
  dangerValue: {
    color: "#ba1a1a",
  },
  cancelledAmount: {
    color: "#6d7a77",
    textDecorationLine: "line-through",
  },
  paymentMain: {
    flex: 1,
    alignItems: "flex-start",
  },
  paymentBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#dde1ff",
  },
  paymentBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#173bab",
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#3d4947",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 4,
  },
  btnRefresh: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#89f5e7",
    alignItems: "center",
    justifyContent: "center",
  },
  btnRefreshText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#005049",
  },
  btnBack: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#bcc9c6",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  btnBackText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#3d4947",
  },
  btnOutline: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#00685f",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#00685f",
  },
  buttonPressed: {
    opacity: 0.72,
  },
});