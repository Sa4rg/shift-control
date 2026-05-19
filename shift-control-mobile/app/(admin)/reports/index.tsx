import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { getDailyReport } from "@/src/api/reports";
import { listStores } from "@/src/api/stores";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import { TextField } from "@/src/components/TextField";
import type { DailyReport, Store } from "@/src/types/api";
import { formatMoney } from "@/src/utils/money";

type StoresState =
  | {
      status: "loading";
      stores: Store[];
      errorMessage: null;
    }
  | {
      status: "ready";
      stores: Store[];
      errorMessage: null;
    }
  | {
      status: "error";
      stores: Store[];
      errorMessage: string;
    };

type ReportState =
  | {
      status: "idle";
      report: null;
      errorMessage: null;
    }
  | {
      status: "loading";
      report: null;
      errorMessage: null;
    }
  | {
      status: "ready";
      report: DailyReport;
      errorMessage: null;
    }
  | {
      status: "error";
      report: null;
      errorMessage: string;
    };

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime());
}

function getTotalGlovo(report: DailyReport): number {
  return report.totalGlovoOnline + report.totalGlovoCash;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

export default function AdminReportsScreen() {
  const [storesState, setStoresState] = useState<StoresState>({
    status: "loading",
    stores: [],
    errorMessage: null,
  });
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [reportState, setReportState] = useState<ReportState>({
    status: "idle",
    report: null,
    errorMessage: null,
  });

  const selectedStore = useMemo(
    () =>
      storesState.status === "ready"
        ? storesState.stores.find((store) => store.id === selectedStoreId) ??
          null
        : null,
    [storesState, selectedStoreId]
  );

  const canLoadReport =
    selectedStoreId !== null && isValidIsoDate(date) && reportState.status !== "loading";

  const loadStores = useCallback(async () => {
    setStoresState({
      status: "loading",
      stores: [],
      errorMessage: null,
    });

    try {
      const stores = await listStores();

      setStoresState({
        status: "ready",
        stores: stores.filter((store) => store.active),
        errorMessage: null,
      });

      if (!selectedStoreId) {
        const firstActiveStore = stores.find((store) => store.active);

        if (firstActiveStore) {
          setSelectedStoreId(firstActiveStore.id);
        }
      }
    } catch (error) {
      setStoresState({
        status: "error",
        stores: [],
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, [selectedStoreId]);

  useFocusEffect(
    useCallback(() => {
      void loadStores();
    }, [loadStores])
  );

  async function handleLoadDailyReport() {
    if (!canLoadReport || !selectedStoreId) {
      return;
    }

    setReportState({
      status: "loading",
      report: null,
      errorMessage: null,
    });

    try {
      const report = await getDailyReport({
        storeId: selectedStoreId,
        date,
      });

      setReportState({
        status: "ready",
        report,
        errorMessage: null,
      });
    } catch (error) {
      setReportState({
        status: "error",
        report: null,
        errorMessage: getApiErrorMessage(error),
      });
    }
  }

  if (storesState.status === "loading") {
    return <LoadingState message="Loading stores..." />;
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Reports</Text>
            <Text style={styles.subtitle}>
              Generate store reports for admin review.
            </Text>
          </View>

          {storesState.status === "error" ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Could not load stores</Text>
              <ErrorMessage message={storesState.errorMessage} />
              <Button title="Try again" onPress={loadStores} />
            </View>
          ) : null}

          {storesState.status === "ready" && storesState.stores.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No active stores</Text>
              <Text style={styles.body}>
                There are no active stores available for reports.
              </Text>
            </View>
          ) : null}

          {storesState.status === "ready" && storesState.stores.length > 0 ? (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Daily report filters</Text>

                <Text style={styles.label}>Store</Text>
                <View style={styles.options}>
                  {storesState.stores.map((store) => (
                    <Button
                      key={store.id}
                      title={
                        store.id === selectedStoreId
                          ? `✓ ${store.name}`
                          : store.name
                      }
                      onPress={() => setSelectedStoreId(store.id)}
                    />
                  ))}
                </View>

                {selectedStore ? (
                  <Text style={styles.helpText}>
                    Selected store: {selectedStore.name}
                  </Text>
                ) : null}

                <TextField
                  label="Date"
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                />

                {date.length > 0 && !isValidIsoDate(date) ? (
                  <Text style={styles.helpText}>
                    Date must use YYYY-MM-DD format.
                  </Text>
                ) : null}

                <Button
                  title="Load daily report"
                  onPress={handleLoadDailyReport}
                  loading={reportState.status === "loading"}
                  disabled={!canLoadReport}
                />
              </View>

              {reportState.status === "error" ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Could not load report</Text>
                  <ErrorMessage message={reportState.errorMessage} />
                </View>
              ) : null}

              {reportState.status === "idle" ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>No report loaded</Text>
                  <Text style={styles.body}>
                    Select a store and date, then load the daily report.
                  </Text>
                </View>
              ) : null}

              {reportState.status === "ready" ? (
                <>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                      Daily report · {reportState.report.date}
                    </Text>
                    <Text style={styles.body}>{reportState.report.storeName}</Text>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Sales totals</Text>

                    <SummaryRow
                      label="Total sales"
                      value={formatMoney(reportState.report.totalSales)}
                    />
                    <SummaryRow
                      label="Cash"
                      value={formatMoney(reportState.report.totalCash)}
                    />
                    <SummaryRow
                      label="MB"
                      value={formatMoney(reportState.report.totalMb)}
                    />
                    <SummaryRow
                      label="Glovo online"
                      value={formatMoney(reportState.report.totalGlovoOnline)}
                    />
                    <SummaryRow
                      label="Glovo cash"
                      value={formatMoney(reportState.report.totalGlovoCash)}
                    />
                    <SummaryRow
                      label="Total Glovo"
                      value={formatMoney(getTotalGlovo(reportState.report))}
                    />
                    <SummaryRow
                      label="Pending invoice"
                      value={formatMoney(reportState.report.pendingInvoiceTotal)}
                    />
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Closures</Text>

                    <SummaryRow
                      label="Closures"
                      value={String(reportState.report.closuresCount)}
                    />
                    <SummaryRow
                      label="Closed OK"
                      value={String(reportState.report.closedOkCount)}
                    />
                    <SummaryRow
                      label="Closed with incident"
                      value={String(
                        reportState.report.closedWithIncidentCount
                      )}
                    />
                    <SummaryRow
                      label="Cash difference total"
                      value={formatMoney(reportState.report.cashDifferenceTotal)}
                    />
                    <SummaryRow
                      label="MB difference total"
                      value={formatMoney(reportState.report.mbDifferenceTotal)}
                    />
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Sales and incidents</Text>

                    <SummaryRow
                      label="Active sales"
                      value={String(reportState.report.activeSalesCount)}
                    />
                    <SummaryRow
                      label="Cancelled sales"
                      value={String(reportState.report.cancelledSalesCount)}
                    />
                    <SummaryRow
                      label="Open incidents"
                      value={String(reportState.report.openIncidentsCount)}
                    />
                    <SummaryRow
                      label="Resolved incidents"
                      value={String(reportState.report.resolvedIncidentsCount)}
                    />
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Staff summaries</Text>

                    {reportState.report.staffSummaries.length === 0 ? (
                      <Text style={styles.body}>
                        No staff summaries for this date.
                      </Text>
                    ) : (
                      <View style={styles.staffList}>
                        {reportState.report.staffSummaries.map((staff) => (
                          <View key={staff.staffId} style={styles.staffRow}>
                            <Text style={styles.staffTitle}>
                              {staff.staffName}
                            </Text>
                            <Text style={styles.staffMeta}>
                              Sales: {formatMoney(staff.totalSales)}
                            </Text>
                            <Text style={styles.staffMeta}>
                              Cash: {formatMoney(staff.totalCash)} · MB:{" "}
                              {formatMoney(staff.totalMb)}
                            </Text>
                            <Text style={styles.staffMeta}>
                              Glovo:{" "}
                              {formatMoney(
                                staff.totalGlovoOnline + staff.totalGlovoCash
                              )}
                            </Text>
                            <Text style={styles.staffMeta}>
                              Closures: {staff.closuresCount} · Incidents:{" "}
                              {staff.openIncidentsCount +
                                staff.resolvedIncidentsCount}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </>
              ) : null}
            </>
          ) : null}

          <View style={styles.actions}>
            <Button title="Back" onPress={() => router.back()} />
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
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333333",
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#555555",
  },
  options: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 16,
    color: "#555555",
  },
  summaryValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
  },
  staffList: {
    gap: 12,
  },
  staffRow: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  staffTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  staffMeta: {
    fontSize: 14,
    color: "#666666",
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
});