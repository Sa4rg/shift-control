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
import { getDailyReport, getWeeklyReport } from "@/src/api/reports";
import { listStores } from "@/src/api/stores";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import { TextField } from "@/src/components/TextField";
import type {
  DailyReport,
  Store,
  WeeklyReport,
  WeeklyStaffSummary,
} from "@/src/types/api";
import { formatMoney } from "@/src/utils/money";

type ReportMode = "DAILY" | "WEEKLY";

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
      dailyReport: null;
      weeklyReport: null;
      errorMessage: null;
    }
  | {
      status: "loading";
      dailyReport: null;
      weeklyReport: null;
      errorMessage: null;
    }
  | {
      status: "ready";
      dailyReport: DailyReport | null;
      weeklyReport: WeeklyReport | null;
      errorMessage: null;
    }
  | {
      status: "error";
      dailyReport: null;
      weeklyReport: null;
      errorMessage: string;
    };

type WeeklyTotals = {
  totalCash: number;
  totalMb: number;
  totalGlovoOnline: number;
  totalGlovoCash: number;
  totalSales: number;
  pendingInvoiceTotal: number;
  cashDifferenceTotal: number;
  mbDifferenceTotal: number;
  closuresCount: number;
  incidentCount: number;
};

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime());
}

function getDailyTotalGlovo(report: DailyReport): number {
  return report.totalGlovoOnline + report.totalGlovoCash;
}

function getWeeklyStaffTotalGlovo(staff: WeeklyStaffSummary): number {
  return staff.totalGlovoOnline + staff.totalGlovoCash;
}

function getWeeklyTotals(report: WeeklyReport): WeeklyTotals {
  return report.staffSummaries.reduce<WeeklyTotals>(
    (totals, staff) => ({
      totalCash: totals.totalCash + staff.totalCash,
      totalMb: totals.totalMb + staff.totalMb,
      totalGlovoOnline: totals.totalGlovoOnline + staff.totalGlovoOnline,
      totalGlovoCash: totals.totalGlovoCash + staff.totalGlovoCash,
      totalSales: totals.totalSales + staff.totalSales,
      pendingInvoiceTotal:
        totals.pendingInvoiceTotal + staff.pendingInvoiceTotal,
      cashDifferenceTotal:
        totals.cashDifferenceTotal + staff.cashDifferenceTotal,
      mbDifferenceTotal: totals.mbDifferenceTotal + staff.mbDifferenceTotal,
      closuresCount: totals.closuresCount + staff.closuresCount,
      incidentCount: totals.incidentCount + staff.incidentCount,
    }),
    {
      totalCash: 0,
      totalMb: 0,
      totalGlovoOnline: 0,
      totalGlovoCash: 0,
      totalSales: 0,
      pendingInvoiceTotal: 0,
      cashDifferenceTotal: 0,
      mbDifferenceTotal: 0,
      closuresCount: 0,
      incidentCount: 0,
    }
  );
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
  const [reportMode, setReportMode] = useState<ReportMode>("DAILY");
  const [date, setDate] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [reportState, setReportState] = useState<ReportState>({
    status: "idle",
    dailyReport: null,
    weeklyReport: null,
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
    selectedStoreId !== null &&
    reportState.status !== "loading" &&
    (reportMode === "DAILY"
      ? isValidIsoDate(date)
      : isValidIsoDate(weekStart));

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

  function handleChangeReportMode(nextMode: ReportMode) {
    setReportMode(nextMode);
    setReportState({
      status: "idle",
      dailyReport: null,
      weeklyReport: null,
      errorMessage: null,
    });
  }

  async function handleLoadReport() {
    if (!canLoadReport || !selectedStoreId) {
      return;
    }

    setReportState({
      status: "loading",
      dailyReport: null,
      weeklyReport: null,
      errorMessage: null,
    });

    try {
      if (reportMode === "DAILY") {
        const dailyReport = await getDailyReport({
          storeId: selectedStoreId,
          date,
        });

        setReportState({
          status: "ready",
          dailyReport,
          weeklyReport: null,
          errorMessage: null,
        });

        return;
      }

      const weeklyReport = await getWeeklyReport({
        storeId: selectedStoreId,
        weekStart,
      });

      setReportState({
        status: "ready",
        dailyReport: null,
        weeklyReport,
        errorMessage: null,
      });
    } catch (error) {
      setReportState({
        status: "error",
        dailyReport: null,
        weeklyReport: null,
        errorMessage: getApiErrorMessage(error),
      });
    }
  }

  if (storesState.status === "loading") {
    return <LoadingState message="Loading stores..." />;
  }

  const weeklyTotals =
    reportState.status === "ready" && reportState.weeklyReport
      ? getWeeklyTotals(reportState.weeklyReport)
      : null;

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
                <Text style={styles.cardTitle}>Report type</Text>

                <View style={styles.options}>
                  <Button
                    title={reportMode === "DAILY" ? "✓ Daily" : "Daily"}
                    onPress={() => handleChangeReportMode("DAILY")}
                  />
                  <Button
                    title={reportMode === "WEEKLY" ? "✓ Weekly" : "Weekly"}
                    onPress={() => handleChangeReportMode("WEEKLY")}
                  />
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {reportMode === "DAILY"
                    ? "Daily report filters"
                    : "Weekly report filters"}
                </Text>

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

                {reportMode === "DAILY" ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <TextField
                      label="Week start"
                      value={weekStart}
                      onChangeText={setWeekStart}
                      placeholder="YYYY-MM-DD"
                      keyboardType="numbers-and-punctuation"
                    />

                    {weekStart.length > 0 && !isValidIsoDate(weekStart) ? (
                      <Text style={styles.helpText}>
                        Week start must use YYYY-MM-DD format.
                      </Text>
                    ) : null}

                    <Text style={styles.helpText}>
                      Use the first day of the reporting week.
                    </Text>
                  </>
                )}

                <Button
                  title={
                    reportMode === "DAILY"
                      ? "Load daily report"
                      : "Load weekly report"
                  }
                  onPress={handleLoadReport}
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
                    Select a store and{" "}
                    {reportMode === "DAILY" ? "date" : "week start"}, then load
                    the report.
                  </Text>
                </View>
              ) : null}

              {reportState.status === "ready" && reportState.dailyReport ? (
                <>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                      Daily report · {reportState.dailyReport.date}
                    </Text>
                    <Text style={styles.body}>
                      {reportState.dailyReport.storeName}
                    </Text>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Sales totals</Text>

                    <SummaryRow
                      label="Total sales"
                      value={formatMoney(reportState.dailyReport.totalSales)}
                    />
                    <SummaryRow
                      label="Cash"
                      value={formatMoney(reportState.dailyReport.totalCash)}
                    />
                    <SummaryRow
                      label="MB"
                      value={formatMoney(reportState.dailyReport.totalMb)}
                    />
                    <SummaryRow
                      label="Glovo online"
                      value={formatMoney(
                        reportState.dailyReport.totalGlovoOnline
                      )}
                    />
                    <SummaryRow
                      label="Glovo cash"
                      value={formatMoney(
                        reportState.dailyReport.totalGlovoCash
                      )}
                    />
                    <SummaryRow
                      label="Total Glovo"
                      value={formatMoney(
                        getDailyTotalGlovo(reportState.dailyReport)
                      )}
                    />
                    <SummaryRow
                      label="Pending invoice"
                      value={formatMoney(
                        reportState.dailyReport.pendingInvoiceTotal
                      )}
                    />
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Closures</Text>

                    <SummaryRow
                      label="Closures"
                      value={String(reportState.dailyReport.closuresCount)}
                    />
                    <SummaryRow
                      label="Closed OK"
                      value={String(reportState.dailyReport.closedOkCount)}
                    />
                    <SummaryRow
                      label="Closed with incident"
                      value={String(
                        reportState.dailyReport.closedWithIncidentCount
                      )}
                    />
                    <SummaryRow
                      label="Cash difference total"
                      value={formatMoney(
                        reportState.dailyReport.cashDifferenceTotal
                      )}
                    />
                    <SummaryRow
                      label="MB difference total"
                      value={formatMoney(
                        reportState.dailyReport.mbDifferenceTotal
                      )}
                    />
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Sales and incidents</Text>

                    <SummaryRow
                      label="Active sales"
                      value={String(reportState.dailyReport.activeSalesCount)}
                    />
                    <SummaryRow
                      label="Cancelled sales"
                      value={String(
                        reportState.dailyReport.cancelledSalesCount
                      )}
                    />
                    <SummaryRow
                      label="Open incidents"
                      value={String(
                        reportState.dailyReport.openIncidentsCount
                      )}
                    />
                    <SummaryRow
                      label="Resolved incidents"
                      value={String(
                        reportState.dailyReport.resolvedIncidentsCount
                      )}
                    />
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Staff summaries</Text>

                    {reportState.dailyReport.staffSummaries.length === 0 ? (
                      <Text style={styles.body}>
                        No staff summaries for this date.
                      </Text>
                    ) : (
                      <View style={styles.staffList}>
                        {reportState.dailyReport.staffSummaries.map((staff) => (
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

              {reportState.status === "ready" &&
              reportState.weeklyReport &&
              weeklyTotals ? (
                <>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                      Weekly report · {reportState.weeklyReport.weekStart} to{" "}
                      {reportState.weeklyReport.weekEnd}
                    </Text>
                    <Text style={styles.body}>
                      {selectedStore?.name ?? "Selected store"}
                    </Text>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Weekly totals</Text>

                    <SummaryRow
                      label="Total sales"
                      value={formatMoney(weeklyTotals.totalSales)}
                    />
                    <SummaryRow
                      label="Cash"
                      value={formatMoney(weeklyTotals.totalCash)}
                    />
                    <SummaryRow
                      label="MB"
                      value={formatMoney(weeklyTotals.totalMb)}
                    />
                    <SummaryRow
                      label="Glovo online"
                      value={formatMoney(weeklyTotals.totalGlovoOnline)}
                    />
                    <SummaryRow
                      label="Glovo cash"
                      value={formatMoney(weeklyTotals.totalGlovoCash)}
                    />
                    <SummaryRow
                      label="Total Glovo"
                      value={formatMoney(
                        weeklyTotals.totalGlovoOnline +
                          weeklyTotals.totalGlovoCash
                      )}
                    />
                    <SummaryRow
                      label="Pending invoice"
                      value={formatMoney(weeklyTotals.pendingInvoiceTotal)}
                    />
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Closures and incidents</Text>

                    <SummaryRow
                      label="Closures"
                      value={String(weeklyTotals.closuresCount)}
                    />
                    <SummaryRow
                      label="Incidents"
                      value={String(weeklyTotals.incidentCount)}
                    />
                    <SummaryRow
                      label="Cash difference total"
                      value={formatMoney(weeklyTotals.cashDifferenceTotal)}
                    />
                    <SummaryRow
                      label="MB difference total"
                      value={formatMoney(weeklyTotals.mbDifferenceTotal)}
                    />
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Staff summaries</Text>

                    {reportState.weeklyReport.staffSummaries.length === 0 ? (
                      <Text style={styles.body}>
                        No staff summaries for this week.
                      </Text>
                    ) : (
                      <View style={styles.staffList}>
                        {reportState.weeklyReport.staffSummaries.map(
                          (staff) => (
                            <View key={staff.staffId} style={styles.staffRow}>
                              <Text style={styles.staffTitle}>
                                {staff.staffName}
                              </Text>
                              <Text style={styles.staffMeta}>
                                Store: {staff.storeName}
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
                                {formatMoney(getWeeklyStaffTotalGlovo(staff))}
                              </Text>
                              <Text style={styles.staffMeta}>
                                Closures: {staff.closuresCount} · Incidents:{" "}
                                {staff.incidentCount}
                              </Text>
                            </View>
                          )
                        )}
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