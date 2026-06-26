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
import { listSalesByShiftId } from "@/src/api/sales";
import { getShiftById, getShiftClosureByShiftId } from "@/src/api/shifts";
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type {
  InvoiceStatus,
  Sale,
  SaleStatus,
  Shift,
  ShiftClosure,
  ShiftStatus,
} from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { formatMoney } from "@/src/utils/money";
import { colors, fontWeight, fontSize, shadows, radius } from "@/src/theme";

type AdminShiftDetailState =
  | {
      status: "loading";
      shift: null;
      closure: null;
      sales: Sale[];
      errorMessage: null;
    }
  | {
      status: "ready";
      shift: Shift;
      closure: ShiftClosure | null;
      sales: Sale[];
      errorMessage: null;
    }
  | {
      status: "error";
      shift: null;
      closure: null;
      sales: Sale[];
      errorMessage: string;
    };

function getBaseCashAmount(closure: ShiftClosure): number {
  return closure.expectedPhysicalCash - closure.cashToWithdraw;
}

function getTotalGlovoAmount(closure: ShiftClosure): number {
  return closure.totalGlovoOnline + closure.totalGlovoCash;
}

function formatShortId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
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

function ShiftStatusPill({ status }: { status: ShiftStatus }) {
  const isClosed = status === "CLOSED";

  return (
    <View
      style={[
        styles.shiftStatusPill,
        isClosed ? styles.shiftStatusPillClosed : styles.shiftStatusPillOpen,
      ]}
    >
      <Text
        style={[
          styles.shiftStatusPillText,
          isClosed
            ? styles.shiftStatusPillTextClosed
            : styles.shiftStatusPillTextOpen,
        ]}
      >
        {isClosed ? "Shift Closed" : "Shift Open"}
      </Text>
    </View>
  );
}

function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const isActive = status === "ACTIVE";

  return (
    <View
      style={[
        styles.saleBadge,
        isActive ? styles.saleBadgeActive : styles.saleBadgeCancelled,
      ]}
    >
      <Text
        style={[
          styles.saleBadgeText,
          isActive ? styles.saleBadgeTextActive : styles.saleBadgeTextCancelled,
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  const isInvoiced = status === "INVOICED";

  return (
    <View
      style={[
        styles.saleBadge,
        isInvoiced ? styles.invoiceBadgeInvoiced : styles.invoiceBadgePending,
      ]}
    >
      <Text
        style={[
          styles.saleBadgeText,
          isInvoiced
            ? styles.invoiceBadgeTextInvoiced
            : styles.invoiceBadgeTextPending,
        ]}
      >
        {isInvoiced ? "INVOICE: YES" : "INVOICE: NO"}
      </Text>
    </View>
  );
}

function SaleRow({ sale, isLast }: { sale: Sale; isLast: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.saleRow,
        isLast && styles.saleRowLast,
        pressed && styles.rowPressed,
      ]}
      onPress={() => router.push(`/(admin)/sales/${sale.id}`)}
    >
      <View style={styles.saleMain}>
        <Text style={styles.saleTitle}>{formatShortId(sale.id)}</Text>

        <View style={styles.saleBadges}>
          <SaleStatusBadge status={sale.status} />
          <InvoiceBadge status={sale.invoiceStatus} />
        </View>

        <Text style={styles.saleDate}>{formatDateTime(sale.createdAt)}</Text>
      </View>

      <Text
        style={[
          styles.saleTotal,
          sale.status === "CANCELLED" && styles.saleTotalCancelled,
        ]}
      >
        {formatMoney(sale.finalTotalAmount)}
      </Text>
    </Pressable>
  );
}

export default function AdminShiftDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const shiftId = params.id;

  const [state, setState] = useState<AdminShiftDetailState>({
    status: "loading",
    shift: null,
    closure: null,
    sales: [],
    errorMessage: null,
  });

  const loadShiftDetail = useCallback(async () => {
    if (!shiftId) {
      setState({
        status: "error",
        shift: null,
        closure: null,
        sales: [],
        errorMessage: "Shift id is missing.",
      });
      return;
    }

    setState({
      status: "loading",
      shift: null,
      closure: null,
      sales: [],
      errorMessage: null,
    });

    try {
      const shift = await getShiftById(shiftId);
      const sales = await listSalesByShiftId(shiftId);

      let closure: ShiftClosure | null = null;

      if (shift.status === "CLOSED") {
        try {
          closure = await getShiftClosureByShiftId(shiftId);
        } catch {
          closure = null;
        }
      }

      setState({
        status: "ready",
        shift,
        closure,
        sales,
        errorMessage: null,
      });
    } catch (error) {
      setState({
        status: "error",
        shift: null,
        closure: null,
        sales: [],
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, [shiftId]);

  useEffect(() => {
    void loadShiftDetail();
  }, [loadShiftDetail]);

  if (state.status === "loading") {
    return <LoadingState message="Loading shift..." />;
  }

  const appBar = <AppTopBar variant="back" />;

  if (state.status === "error") {
    return (
      <SafeAreaView style={styles.safeArea}>
        {appBar}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Could not load shift</Text>
            </View>

            <View style={styles.cardBody}>
              <ErrorMessage message={state.errorMessage} />

              <Pressable
                style={({ pressed }) => [
                  styles.btnOutline,
                  pressed && styles.buttonPressed,
                ]}
                onPress={loadShiftDetail}
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

  const { shift, closure, sales } = state;
  const visibleSales = sales.slice(0, 3);
  const hasHiddenSales = sales.length > visibleSales.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      {appBar}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.shiftHeader}>
          <Text style={styles.shiftId}>Shift ID: {formatShortId(shift.id)}</Text>
          <ShiftStatusPill status={shift.status} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>◷</Text>
            <Text style={styles.cardTitle}>Shift</Text>
          </View>

          <View style={styles.cardBody}>
            <DetailRow label="Type" value={shift.type} />
            <DetailRow
              label="Status"
              value={shift.status === "CLOSED" ? "Closed" : "Open"}
              valueStyle={
                shift.status === "CLOSED"
                  ? styles.primaryValue
                  : styles.warningValue
              }
            />
            <DetailRow label="Staff member" value={shift.staffName} />
            <DetailRow label="Store name" value={shift.storeName} />
            <DetailRow label="Opened at" value={formatDateTime(shift.openedAt)} />
            <DetailRow
              label="Closed at"
              value={shift.closedAt ? formatDateTime(shift.closedAt) : null}
            />
          </View>
        </View>

        {closure ? (
          <>
            <View style={[styles.card, styles.closureCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardHeaderIcon}>▣</Text>
                <Text style={styles.cardTitle}>Closure totals</Text>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.totalSalesRow}>
                  <Text style={styles.detailLabel}>Total sales</Text>
                  <Text style={styles.totalSalesValue}>
                    {formatMoney(closure.totalSales)}
                  </Text>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.twoColumnRow}>
                  <View style={styles.amountBlock}>
                    <Text style={styles.amountLabel}>Cash</Text>
                    <Text style={styles.amountValue}>
                      {formatMoney(closure.totalCash)}
                    </Text>
                  </View>

                  <View style={styles.amountBlock}>
                    <Text style={styles.amountLabel}>MB</Text>
                    <Text style={styles.amountValue}>
                      {formatMoney(closure.totalMb)}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <DetailRow
                  label="Glovo online"
                  value={formatMoney(closure.totalGlovoOnline)}
                />
                <DetailRow
                  label="Glovo cash"
                  value={formatMoney(closure.totalGlovoCash)}
                />
                <DetailRow
                  label="Total Glovo"
                  value={formatMoney(getTotalGlovoAmount(closure))}
                  valueStyle={styles.primaryValue}
                />

                <View style={styles.cardDivider} />

                <View style={styles.cashSummary}>
                  <View style={styles.cashSummaryBlock}>
                    <Text style={styles.cashSummaryLabel}>Cash to withdraw</Text>
                    <Text style={styles.cashSummaryValue}>
                      {formatMoney(closure.cashToWithdraw)}
                    </Text>
                  </View>

                  <View style={[styles.cashSummaryBlock, styles.cashSummaryRight]}>
                    <Text style={styles.cashSummaryLabel}>Expected physical</Text>
                    <Text style={styles.cashSummarySecondaryValue}>
                      {formatMoney(closure.expectedPhysicalCash)}
                    </Text>
                  </View>
                </View>

                <DetailRow
                  label="Base cash kept"
                  value={formatMoney(getBaseCashAmount(closure))}
                />
                <DetailRow
                  label="Confirmed cash"
                  value={formatMoney(closure.confirmedCashAmount)}
                />
                <DetailRow
                  label="Confirmed MB"
                  value={formatMoney(closure.confirmedMbAmount)}
                />
                <DetailRow
                  label="Cash difference"
                  value={formatMoney(closure.cashDifference)}
                  valueStyle={
                    closure.cashDifference === 0
                      ? undefined
                      : styles.warningValue
                  }
                />
                <DetailRow
                  label="MB difference"
                  value={formatMoney(closure.mbDifference)}
                  valueStyle={
                    closure.mbDifference === 0 ? undefined : styles.warningValue
                  }
                />
                <DetailRow
                  label="Closure status"
                  value={closure.status}
                  valueStyle={
                    closure.status === "CLOSED_OK"
                      ? styles.primaryValue
                      : styles.warningValue
                  }
                />
                <DetailRow
                  label="Closed at"
                  value={formatDateTime(closure.createdAt)}
                />
              </View>
            </View>

            {closure.note ? (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Closure note</Text>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.bodyText}>{closure.note}</Text>
                </View>
              </View>
            ) : null}
          </>
        ) : shift.status === "CLOSED" ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Closure not available</Text>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.bodyText}>
                This shift is closed, but its closure could not be loaded.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.salesHeader}>
            <View style={styles.salesHeaderLeft}>
              <Text style={styles.cardHeaderIcon}>▤</Text>
              <Text style={styles.cardTitle}>Sales</Text>
            </View>

            <View style={styles.salesCountPill}>
              <Text style={styles.salesCountText}>
                {sales.length} {sales.length === 1 ? "Transaction" : "Transactions"}
              </Text>
            </View>
          </View>

          {sales.length === 0 ? (
            <View style={styles.cardBody}>
              <Text style={styles.bodyText}>
                No sales registered for this shift.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.salesList}>
                {visibleSales.map((sale, index) => (
                  <SaleRow
                    key={sale.id}
                    sale={sale}
                    isLast={!hasHiddenSales && index === visibleSales.length - 1}
                  />
                ))}
              </View>

              {hasHiddenSales ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.viewAllButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => router.push(`/(admin)/sales?shiftId=${shift.id}` as never)}
                >
                  <Text style={styles.viewAllText}>VIEW ALL TRANSACTIONS</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.btnRefresh,
              pressed && styles.buttonPressed,
            ]}
            onPress={loadShiftDetail}
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
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    gap: 16,
  },
  shiftHeader: {
    gap: 8,
  },
  shiftId: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  shiftStatusPill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  shiftStatusPillClosed: {
    backgroundColor: colors.primarySoft,
    borderColor: "#b9ddd8",
  },
  shiftStatusPillOpen: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
  },
  shiftStatusPillText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
  },
  shiftStatusPillTextClosed: {
    color: colors.primary,
  },
  shiftStatusPillTextOpen: {
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
  closureCard: {
    backgroundColor: colors.surface,
  },
  cardHeader: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  cardHeaderIcon: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  cardTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  cardBody: {
    padding: 16,
    gap: 12,
  },
  detailRow: {
    minHeight: 34,
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
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  detailValue: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: "right",
  },
  primaryValue: {
    color: colors.primary,
  },
  warningValue: {
    color: colors.warning,
  },
  totalSalesRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  totalSalesValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.borderSoft,
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 16,
  },
  amountBlock: {
    flex: 1,
    gap: 4,
  },
  amountLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  amountValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  cashSummary: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#f2fffc",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cashSummaryBlock: {
    flex: 1,
    gap: 4,
  },
  cashSummaryRight: {
    alignItems: "flex-end",
  },
  cashSummaryLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  cashSummaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  cashSummarySecondaryValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: "right",
  },
  bodyText: {
    fontSize: fontSize.lg,
    lineHeight: 22,
    color: colors.textMuted,
  },
  salesHeader: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  salesHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  salesCountPill: {
    borderRadius: radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: colors.secondarySoft,
  },
  salesCountText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  salesList: {
    backgroundColor: colors.surface,
  },
  saleRow: {
    minHeight: 78,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  saleRowLast: {
    borderBottomWidth: 0,
  },
  saleMain: {
    flex: 1,
    gap: 6,
  },
  saleTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  saleBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  saleBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  saleBadgeActive: {
    backgroundColor: colors.primaryMuted,
  },
  saleBadgeCancelled: {
    backgroundColor: "#dae2fd",
  },
  saleBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  saleBadgeTextActive: {
    color: colors.primaryDark,
  },
  saleBadgeTextCancelled: {
    color: colors.textMuted,
  },
  invoiceBadgeInvoiced: {
    backgroundColor: colors.secondarySoft,
  },
  invoiceBadgePending: {
    backgroundColor: colors.surfaceMuted,
  },
  invoiceBadgeTextInvoiced: {
    color: "#173bab",
  },
  invoiceBadgeTextPending: {
    color: colors.textMuted,
  },
  saleDate: {
    fontSize: fontSize.sm,
    color: colors.textSubtle,
  },
  saleTotal: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  saleTotalCancelled: {
    color: colors.textSubtle,
    textDecorationLine: "line-through",
  },
  viewAllButton: {
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  viewAllText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 1,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
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
    backgroundColor: colors.secondarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRefreshText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.secondaryDark,
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