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
import { useAuth } from "@/src/auth/AuthContext";
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
  const { user } = useAuth();
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

  const displayName = user?.fullName ?? user?.username ?? "Admin";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (state.status === "loading") {
    return <LoadingState message="Loading shift..." />;
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

        <Text style={styles.appBarTitle}>Shift detail</Text>
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
                  onPress={() => router.push("/(admin)/sales" as never)}
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
  shiftHeader: {
    gap: 8,
  },
  shiftId: {
    fontSize: 13,
    fontWeight: "900",
    color: "#3d4947",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  shiftStatusPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  shiftStatusPillClosed: {
    backgroundColor: "#edf8f6",
    borderColor: "#b9ddd8",
  },
  shiftStatusPillOpen: {
    backgroundColor: "#fff8e6",
    borderColor: "#f0d8a0",
  },
  shiftStatusPillText: {
    fontSize: 11,
    fontWeight: "900",
  },
  shiftStatusPillTextClosed: {
    color: "#00685f",
  },
  shiftStatusPillTextOpen: {
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
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  closureCard: {
    backgroundColor: "#ffffff",
  },
  cardHeader: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  cardHeaderIcon: {
    fontSize: 14,
    color: "#00685f",
    fontWeight: "900",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#131b2e",
  },
  cardBody: {
    padding: 16,
    gap: 12,
  },
  detailRow: {
    minHeight: 34,
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
    fontSize: 14,
    color: "#3d4947",
  },
  detailValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#131b2e",
    textAlign: "right",
  },
  primaryValue: {
    color: "#00685f",
  },
  warningValue: {
    color: "#825100",
  },
  totalSalesRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  totalSalesValue: {
    fontSize: 17,
    fontWeight: "900",
    color: "#131b2e",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#eaedff",
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
    fontSize: 12,
    fontWeight: "700",
    color: "#3d4947",
  },
  amountValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#131b2e",
  },
  cashSummary: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d8e0dd",
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
    fontSize: 12,
    fontWeight: "800",
    color: "#00685f",
  },
  cashSummaryValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#00685f",
  },
  cashSummarySecondaryValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#131b2e",
    textAlign: "right",
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#3d4947",
  },
  salesHeader: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
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
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: "#dde1ff",
  },
  salesCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#3d4947",
  },
  salesList: {
    backgroundColor: "#ffffff",
  },
  saleRow: {
    minHeight: 78,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
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
    fontSize: 15,
    fontWeight: "900",
    color: "#131b2e",
  },
  saleBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  saleBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  saleBadgeActive: {
    backgroundColor: "#d2f5f0",
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
    color: "#005049",
  },
  saleBadgeTextCancelled: {
    color: "#3d4947",
  },
  invoiceBadgeInvoiced: {
    backgroundColor: "#dde1ff",
  },
  invoiceBadgePending: {
    backgroundColor: "#f2f3ff",
  },
  invoiceBadgeTextInvoiced: {
    color: "#173bab",
  },
  invoiceBadgeTextPending: {
    color: "#3d4947",
  },
  saleDate: {
    fontSize: 12,
    color: "#6d7a77",
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#131b2e",
  },
  saleTotalCancelled: {
    color: "#6d7a77",
    textDecorationLine: "line-through",
  },
  viewAllButton: {
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: "#eaedff",
    alignItems: "center",
    justifyContent: "center",
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#00685f",
    letterSpacing: 1,
  },
  rowPressed: {
    backgroundColor: "#f2f3ff",
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
    backgroundColor: "#dde1ff",
    alignItems: "center",
    justifyContent: "center",
  },
  btnRefreshText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#00217a",
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