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
import { getDailyReport, getMonthlyReport, getWeeklyReport } from "@/src/api/reports";
import { listStores } from "@/src/api/stores";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import { TextField } from "@/src/components/TextField";
import { MonthlyReportView } from "@/src/features/admin/reports/MonthlyReportView";
import { DailyReportView } from "@/src/features/admin/reports/DailyReportView";
import { WeeklyReportView } from "@/src/features/admin/reports/WeeklyReportView";
import {
  isValidIsoDate,
  isValidYearMonth,
} from "@/src/features/admin/reports/reportDateUtils";
import type { DailyReport, MonthlyReport, Store, WeeklyReport } from "@/src/types/api";

type ReportMode = "DAILY" | "WEEKLY" | "MONTHLY";

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
      monthlyReport: null;
      errorMessage: null;
    }
  | {
      status: "loading";
      dailyReport: null;
      weeklyReport: null;
      monthlyReport: null;
      errorMessage: null;
    }
  | {
      status: "ready";
      dailyReport: DailyReport | null;
      weeklyReport: WeeklyReport | null;
      monthlyReport: MonthlyReport | null;
      errorMessage: null;
    }
  | {
      status: "error";
      dailyReport: null;
      weeklyReport: null;
      monthlyReport: null;
      errorMessage: string;
    };

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
  const [month, setMonth] = useState("");
  const [reportState, setReportState] = useState<ReportState>({
    status: "idle",
    dailyReport: null,
    weeklyReport: null,
    monthlyReport: null,
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
      : reportMode === "WEEKLY"
        ? isValidIsoDate(weekStart)
        : isValidYearMonth(month));

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
      monthlyReport: null,
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
      monthlyReport: null,
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
          monthlyReport: null,
          errorMessage: null,
        });

        return;
      }

      if (reportMode === "WEEKLY") {
        const weeklyReport = await getWeeklyReport({
          storeId: selectedStoreId,
          weekStart,
        });

        setReportState({
          status: "ready",
          dailyReport: null,
          weeklyReport,
          monthlyReport: null,
          errorMessage: null,
        });

        return;
      }

      const monthlyReport = await getMonthlyReport({
        storeId: selectedStoreId,
        month,
      });

      setReportState({
        status: "ready",
        dailyReport: null,
        weeklyReport: null,
        monthlyReport,
        errorMessage: null,
      });
    } catch (error) {
      setReportState({
        status: "error",
        dailyReport: null,
        weeklyReport: null,
        monthlyReport: null,
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
                  <Button
                    title={reportMode === "MONTHLY" ? "✓ Monthly" : "Monthly"}
                    onPress={() => handleChangeReportMode("MONTHLY")}
                  />
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {reportMode === "DAILY"
                    ? "Daily report filters"
                    : reportMode === "WEEKLY"
                      ? "Weekly report filters"
                      : "Monthly report filters"}
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
                ) : reportMode === "WEEKLY" ? (
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
                ) : (
                  <>
                    <TextField
                      label="Month"
                      value={month}
                      onChangeText={setMonth}
                      placeholder="YYYY-MM"
                      keyboardType="numbers-and-punctuation"
                    />

                    {month.length > 0 && !isValidYearMonth(month) ? (
                      <Text style={styles.helpText}>
                        Month must use YYYY-MM format.
                      </Text>
                    ) : null}
                  </>
                )}

                <Button
                  title={
                    reportMode === "DAILY"
                      ? "Load daily report"
                      : reportMode === "WEEKLY"
                        ? "Load weekly report"
                        : "Load monthly report"
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
                    {reportMode === "DAILY"
                      ? "date"
                      : reportMode === "WEEKLY"
                        ? "week start"
                        : "month"}{", then load the report."}
                  </Text>
                </View>
              ) : null}

              {reportState.status === "ready" && reportState.dailyReport ? (
                <DailyReportView report={reportState.dailyReport} />
              ) : null}

              {reportState.status === "ready" && reportState.weeklyReport ? (
                <WeeklyReportView
                  report={reportState.weeklyReport}
                  storeName={selectedStore?.name ?? "Selected store"}
                />
              ) : null}

              {reportState.status === "ready" && reportState.monthlyReport ? (
                <MonthlyReportView report={reportState.monthlyReport} />
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
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
});