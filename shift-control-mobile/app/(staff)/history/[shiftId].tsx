import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import {
  getShiftById,
  getShiftClosureByShiftId,
} from "@/src/api/shifts";
import { listSalesByShiftId } from "@/src/api/sales";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import type { Sale, Shift, ShiftClosure } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { formatMoney } from "@/src/utils/money";

type ShiftHistoryDetailState =
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

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function getBaseCashAmount(closure: ShiftClosure): number {
  return closure.expectedPhysicalCash - closure.cashToWithdraw;
}

function getTotalGlovoAmount(closure: ShiftClosure): number {
  return closure.totalGlovoOnline + closure.totalGlovoCash;
}

export default function ShiftHistoryDetailScreen() {
  const params = useLocalSearchParams<{ shiftId?: string }>();
  const shiftId = params.shiftId;

  const [state, setState] = useState<ShiftHistoryDetailState>({
    status: "loading",
    shift: null,
    closure: null,
    sales: [],
    errorMessage: null,
  });

  const loadShiftHistory = useCallback(async () => {
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
    void loadShiftHistory();
  }, [loadShiftHistory]);

  if (state.status === "loading") {
    return <LoadingState message="Loading shift history..." />;
  }

  if (state.status === "error") {
    return (
      <Screen>
        <View style={styles.container}>
          <Text style={styles.title}>Shift detail</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Could not load shift</Text>
            <ErrorMessage message={state.errorMessage} />
            <Button title="Try again" onPress={loadShiftHistory} />
            <Button title="Back" onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  const { shift, closure, sales } = state;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Shift detail</Text>
          <Text style={styles.subtitle}>Shift {shift.id.slice(0, 8)}</Text>
        </View>

        <View
          style={
            shift.status === "CLOSED" ? styles.successCard : styles.warningCard
          }
        >
          <Text
            style={
              shift.status === "CLOSED"
                ? styles.successTitle
                : styles.warningTitle
            }
          >
            {shift.status === "CLOSED" ? "Closed shift" : "Open shift"}
          </Text>
          <Text
            style={
              shift.status === "CLOSED"
                ? styles.successText
                : styles.warningText
            }
          >
            {shift.status === "CLOSED"
              ? "This shift has already been closed."
              : "This shift is currently open."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shift</Text>

          <DetailRow label="Type" value={shift.type} />
          <DetailRow label="Status" value={shift.status} />
          <DetailRow label="Staff" value={shift.staffName} />
          <DetailRow label="Store" value={shift.storeName} />
          <DetailRow label="Opened at" value={formatDateTime(shift.openedAt)} />
          <DetailRow
            label="Closed at"
            value={shift.closedAt ? formatDateTime(shift.closedAt) : null}
          />
        </View>

        {closure ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Closure totals</Text>

              <DetailRow
                label="Status"
                value={closure.status}
              />
              <DetailRow
                label="Total sales"
                value={formatMoney(closure.totalSales)}
              />
              <DetailRow
                label="Cash sales"
                value={formatMoney(closure.totalCash)}
              />
              <DetailRow label="MB sales" value={formatMoney(closure.totalMb)} />
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
              />
              <DetailRow
                label="Cash to withdraw"
                value={formatMoney(closure.cashToWithdraw)}
              />
              <DetailRow
                label="Base cash kept"
                value={formatMoney(getBaseCashAmount(closure))}
              />
              <DetailRow
                label="Expected physical cash"
                value={formatMoney(closure.expectedPhysicalCash)}
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
              />
              <DetailRow
                label="MB difference"
                value={formatMoney(closure.mbDifference)}
              />
              <DetailRow
                label="Closed at"
                value={formatDateTime(closure.createdAt)}
              />
            </View>

            {closure.note ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Closure note</Text>
                <Text style={styles.body}>{closure.note}</Text>
              </View>
            ) : null}
          </>
        ) : shift.status === "CLOSED" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Closure not available</Text>
            <Text style={styles.body}>
              This shift is closed, but its closure could not be loaded.
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Sales</Text>
            <Text style={styles.sectionMeta}>{sales.length}</Text>
          </View>

          {sales.length === 0 ? (
            <Text style={styles.body}>No sales registered for this shift.</Text>
          ) : (
            <View style={styles.salesList}>
              {sales.map((sale) => (
                <Pressable
                  key={sale.id}
                  style={styles.saleRow}
                  onPress={() => router.push(`/(staff)/sales/${sale.id}`)}
                >
                  <View style={styles.saleMain}>
                    <Text style={styles.saleTitle}>
                      Sale {sale.id.slice(0, 8)}
                    </Text>
                    <Text style={styles.saleMeta}>
                      {sale.status} · {sale.invoiceStatus}
                    </Text>
                    <Text style={styles.saleMeta}>
                      {formatDateTime(sale.createdAt)}
                    </Text>
                  </View>

                  <Text style={styles.saleTotal}>
                    {formatMoney(sale.finalTotalAmount)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Button title="Refresh" onPress={loadShiftHistory} />
          <Button title="Back" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
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
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  detailLabel: {
    flex: 1,
    fontSize: 16,
    color: "#555555",
  },
  detailValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
  },
  successCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#9bd49b",
    borderRadius: 16,
    padding: 20,
    backgroundColor: "#edf9ed",
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f6b1f",
  },
  successText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1f6b1f",
  },
  warningCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#f0d28a",
    borderRadius: 16,
    padding: 20,
    backgroundColor: "#fff8e5",
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#7a5200",
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#7a5200",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionMeta: {
    fontSize: 16,
    fontWeight: "700",
  },
  salesList: {
    gap: 12,
  },
  saleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  saleMain: {
    flex: 1,
    gap: 4,
  },
  saleTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  saleMeta: {
    fontSize: 14,
    color: "#666666",
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: "700",
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
});