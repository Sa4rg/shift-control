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
import { colors, commonStyles, fontWeight, fontSize, radius } from "@/src/theme";

import {
  getShiftDifferenceRows,
  getShiftDisplayStatus,
  getShiftIncidentSummary,
  type ShiftDisplayStatusVariant,
} from "@/src/features/shifts/shiftDisplay";

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
    <View style={commonStyles.detailRow}>
      <Text style={commonStyles.detailLabel}>{label}</Text>
      <Text style={[commonStyles.detailValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function ShiftStatusPill({
  label,
  variant,
}: {
  label: string;
  variant: ShiftDisplayStatusVariant;
}) {
  const isOpen = variant === "open";
  const isWithIncident = variant === "withIncident";

  return (
    <View
      style={[
        styles.shiftStatusPill,
        isOpen && styles.shiftStatusPillOpen,
        !isOpen && !isWithIncident && styles.shiftStatusPillClosed,
        isWithIncident && styles.shiftStatusPillWithIncident,
      ]}
    >
      <Text
        style={[
          styles.shiftStatusPillText,
          isOpen && styles.shiftStatusPillTextOpen,
          !isOpen && !isWithIncident && styles.shiftStatusPillTextClosed,
          isWithIncident && styles.shiftStatusPillTextWithIncident,
        ]}
      >
        {label}
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
      <SafeAreaView style={commonStyles.safeArea}>
        {appBar}

        <ScrollView
          contentContainerStyle={commonStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={commonStyles.card}>
            <View style={styles.cardHeader}>
              <Text style={commonStyles.cardTitle}>Could not load shift</Text>
            </View>

            <View style={commonStyles.cardBody}>
              <ErrorMessage message={state.errorMessage} />

              <Pressable
                style={({ pressed }) => [
                  commonStyles.outlineButton,
                  pressed && commonStyles.buttonPressed,
                ]}
                onPress={loadShiftDetail}
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

  const { shift, closure, sales } = state;
  const visibleSales = sales.slice(0, 3);
  const hasHiddenSales = sales.length > visibleSales.length;

  const displayStatus = getShiftDisplayStatus(shift);
  const differenceRows = getShiftDifferenceRows(shift);
  const incidentSummary = getShiftIncidentSummary(shift);

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      {appBar}

      <ScrollView
        contentContainerStyle={commonStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.shiftHeader}>
          <Text style={styles.shiftId}>Shift ID: {formatShortId(shift.id)}</Text>

          <ShiftStatusPill
            label={displayStatus.label}
            variant={displayStatus.variant}
          />
        </View>

        {differenceRows.length > 0 || incidentSummary ? (
          <View style={styles.incidentSummaryCard}>
            {differenceRows.map((row) => (
              <Text key={row.label} style={styles.incidentSummaryText}>
                {row.label}: {row.value}
              </Text>
            ))}

            {incidentSummary ? (
              <Text style={styles.incidentSummaryCount}>{incidentSummary}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={commonStyles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>◷</Text>
            <Text style={commonStyles.cardTitle}>Shift</Text>
          </View>

          <View style={commonStyles.cardBody}>
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
            <View style={[commonStyles.card, styles.closureCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardHeaderIcon}>▣</Text>
                <Text style={commonStyles.cardTitle}>Closure totals</Text>
              </View>

              <View style={commonStyles.cardBody}>
                <View style={styles.totalSalesRow}>
                  <Text style={commonStyles.detailLabel}>Total sales</Text>
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
              <View style={commonStyles.card}>
                <View style={styles.cardHeader}>
                  <Text style={commonStyles.cardTitle}>Closure note</Text>
                </View>

                <View style={commonStyles.cardBody}>
                  <Text style={styles.bodyText}>{closure.note}</Text>
                </View>
              </View>
            ) : null}
          </>
        ) : shift.status === "CLOSED" ? (
          <View style={commonStyles.card}>
            <View style={styles.cardHeader}>
              <Text style={commonStyles.cardTitle}>Closure not available</Text>
            </View>

            <View style={commonStyles.cardBody}>
              <Text style={styles.bodyText}>
                This shift is closed, but its closure could not be loaded.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={commonStyles.card}>
          <View style={styles.salesHeader}>
            <View style={styles.salesHeaderLeft}>
              <Text style={styles.cardHeaderIcon}>▤</Text>
              <Text style={commonStyles.cardTitle}>Sales</Text>
            </View>

            <View style={styles.salesCountPill}>
              <Text style={styles.salesCountText}>
                {sales.length} {sales.length === 1 ? "Transaction" : "Transactions"}
              </Text>
            </View>
          </View>

          {sales.length === 0 ? (
            <View style={commonStyles.cardBody}>
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
                    pressed && commonStyles.buttonPressed,
                  ]}
                  onPress={() => router.push(`/(admin)/sales?shiftId=${shift.id}` as never)}
                >
                  <Text style={styles.viewAllText}>VIEW ALL TRANSACTIONS</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>

        <View style={commonStyles.actions}>
          <Pressable
            style={({ pressed }) => [
              commonStyles.btnRefresh,
              pressed && commonStyles.buttonPressed,
            ]}
            onPress={loadShiftDetail}
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
  shiftStatusPillWithIncident: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  shiftStatusPillTextWithIncident: {
    color: colors.warning,
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
  incidentSummaryCard: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 12,
    gap: 6,
  },
  incidentSummaryText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
  incidentSummaryCount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
});