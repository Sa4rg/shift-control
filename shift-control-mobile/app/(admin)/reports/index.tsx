import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import {
  getDailyReport,
  getMonthlyReport,
  getWeeklyReport,
} from "@/src/api/reports";
import { listStores } from "@/src/api/stores";
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { DailyReportView } from "@/src/features/admin/reports/DailyReportView";
import { MonthlyReportView } from "@/src/features/admin/reports/MonthlyReportView";
import {
  isValidIsoDate,
  isValidYearMonth,
} from "@/src/features/admin/reports/reportDateUtils";
import { WeeklyReportView } from "@/src/features/admin/reports/WeeklyReportView";
import type {
  DailyReport,
  MonthlyReport,
  Store,
  WeeklyReport,
} from "@/src/types/api";
import { colors, fontWeight, fontSize, shadows, radius } from "@/src/theme";

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

function StoreChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.storeChip,
        selected && styles.storeChipActive,
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.storeChipText,
          selected && styles.storeChipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ReportModeSegment({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.modeSegment,
        selected && styles.modeSegmentActive,
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.modeSegmentText,
          selected && styles.modeSegmentTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AdminReportsScreen() {
  const { user } = useAuth();

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
      const activeStores = stores.filter((store) => store.active);

      setStoresState({
        status: "ready",
        stores: activeStores,
        errorMessage: null,
      });

      if (!selectedStoreId) {
        const firstActiveStore = activeStores[0];

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

  function getCurrentDateValue(): string {
    if (reportMode === "DAILY") {
      return date;
    }

    if (reportMode === "WEEKLY") {
      return weekStart;
    }

    return month;
  }

  function handleChangeCurrentDateValue(value: string) {
    if (reportMode === "DAILY") {
      setDate(value);
      return;
    }

    if (reportMode === "WEEKLY") {
      setWeekStart(value);
      return;
    }

    setMonth(value);
  }

  function getDateLabel(): string {
    if (reportMode === "DAILY") {
      return "Select Date";
    }

    if (reportMode === "WEEKLY") {
      return "Week start";
    }

    return "Select Month";
  }

  function getDatePlaceholder(): string {
    if (reportMode === "MONTHLY") {
      return "YYYY-MM";
    }

    return "YYYY-MM-DD";
  }

  function getDateValidationMessage(): string | null {
    if (reportMode === "DAILY" && date.length > 0 && !isValidIsoDate(date)) {
      return "Date must use YYYY-MM-DD format.";
    }

    if (
      reportMode === "WEEKLY" &&
      weekStart.length > 0 &&
      !isValidIsoDate(weekStart)
    ) {
      return "Week start must use YYYY-MM-DD format.";
    }

    if (
      reportMode === "MONTHLY" &&
      month.length > 0 &&
      !isValidYearMonth(month)
    ) {
      return "Month must use YYYY-MM format.";
    }

    return null;
  }

  const displayName = user?.fullName ?? user?.username ?? "Admin";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (storesState.status === "loading") {
    return <LoadingState message="Loading stores..." />;
  }

  const validationMessage = getDateValidationMessage();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <Text style={styles.menuIcon}>≡</Text>
          <Text style={styles.appBarTitle}>Shift Control</Text>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Reports</Text>
            <Text style={styles.pageSubtitle}>
              Generate store reports for admin review.
            </Text>
          </View>

          {storesState.status === "error" ? (
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <Text style={styles.sectionTitle}>Could not load stores</Text>
                <ErrorMessage message={storesState.errorMessage} />

                <Pressable
                  style={({ pressed }) => [
                    styles.btnOutline,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={loadStores}
                >
                  <Text style={styles.btnOutlineText}>Try again</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {storesState.status === "ready" && storesState.stores.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No active stores</Text>
              <Text style={styles.emptyText}>
                There are no active stores available for reports.
              </Text>
            </View>
          ) : null}

          {storesState.status === "ready" && storesState.stores.length > 0 ? (
            <>
              <View style={styles.filterCard}>
                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>Select Store</Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalChips}
                  >
                    {storesState.stores.map((store) => (
                      <StoreChip
                        key={store.id}
                        label={store.name}
                        selected={store.id === selectedStoreId}
                        onPress={() => setSelectedStoreId(store.id)}
                      />
                    ))}
                  </ScrollView>

                  {selectedStore ? (
                    <Text style={styles.helperText}>
                      Selected store: {selectedStore.name}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.modeSegments}>
                  <ReportModeSegment
                    label="Daily"
                    selected={reportMode === "DAILY"}
                    onPress={() => handleChangeReportMode("DAILY")}
                  />

                  <ReportModeSegment
                    label="Weekly"
                    selected={reportMode === "WEEKLY"}
                    onPress={() => handleChangeReportMode("WEEKLY")}
                  />

                  <ReportModeSegment
                    label="Monthly"
                    selected={reportMode === "MONTHLY"}
                    onPress={() => handleChangeReportMode("MONTHLY")}
                  />
                </View>

                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>{getDateLabel()}</Text>

                  <View
                    style={[
                      styles.dateInputRow,
                      validationMessage && styles.dateInputRowError,
                    ]}
                  >
                    <TextInput
                      style={styles.dateInput}
                      value={getCurrentDateValue()}
                      onChangeText={handleChangeCurrentDateValue}
                      placeholder={getDatePlaceholder()}
                      placeholderTextColor="#6d7a77"
                      keyboardType="numbers-and-punctuation"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Text style={styles.calendarIcon}>□</Text>
                  </View>

                  {reportMode === "WEEKLY" ? (
                    <Text style={styles.helperText}>
                      Use the first day of the reporting week.
                    </Text>
                  ) : null}

                  {validationMessage ? (
                    <Text style={styles.validationText}>
                      {validationMessage}
                    </Text>
                  ) : null}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.btnPrimary,
                    !canLoadReport && styles.btnDisabled,
                    pressed && canLoadReport && styles.buttonPressed,
                  ]}
                  onPress={handleLoadReport}
                  disabled={!canLoadReport}
                >
                  <Text style={styles.btnPrimaryText}>
                    {reportState.status === "loading"
                      ? "Loading…"
                      : "▣ Load report"}
                  </Text>
                </Pressable>
              </View>

              {reportState.status === "error" ? (
                <View style={styles.card}>
                  <View style={styles.cardBody}>
                    <Text style={styles.sectionTitle}>Could not load report</Text>
                    <ErrorMessage message={reportState.errorMessage} />
                  </View>
                </View>
              ) : null}

              {reportState.status === "idle" ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No report loaded</Text>
                  <Text style={styles.emptyText}>
                    Select a store and{" "}
                    {reportMode === "DAILY"
                      ? "date"
                      : reportMode === "WEEKLY"
                        ? "week start"
                        : "month"}
                    , then load the report.
                  </Text>
                </View>
              ) : null}

              {reportState.status === "ready" && reportState.dailyReport ? (
                <View style={styles.reportResultWrapper}>
                  <DailyReportView report={reportState.dailyReport} />
                </View>
              ) : null}

              {reportState.status === "ready" && reportState.weeklyReport ? (
                <View style={styles.reportResultWrapper}>
                  <WeeklyReportView
                    report={reportState.weeklyReport}
                    storeName={selectedStore?.name ?? "Selected store"}
                  />
                </View>
              ) : null}

              {reportState.status === "ready" && reportState.monthlyReport ? (
                <View style={styles.reportResultWrapper}>
                  <MonthlyReportView report={reportState.monthlyReport} />
                </View>
              ) : null}
            </>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.btnBack,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.back()}
            >
              <Text style={styles.btnBackText}>← Back</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnRefresh,
                !canLoadReport && styles.btnRefreshDisabled,
                pressed && canLoadReport && styles.buttonPressed,
              ]}
              onPress={handleLoadReport}
              disabled={!canLoadReport}
            >
              <Text
                style={[
                  styles.btnRefreshText,
                  !canLoadReport && styles.btnRefreshTextDisabled,
                ]}
              >
                ⟳ Refresh
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
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
  menuIcon: {
    fontSize: 20,
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
    fontSize: fontSize.lg,
    color: colors.textMuted,
    lineHeight: 22,
  },
  filterCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 16,
    ...shadows.card,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSubtle,
    letterSpacing: 0.3,
  },
  horizontalChips: {
    gap: 8,
    paddingRight: 4,
  },
  storeChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  storeChipActive: {
    borderColor: "#00685f",
    backgroundColor: "#f2fffc",
  },
  storeChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  storeChipTextActive: {
    color: colors.primary,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.textSubtle,
    lineHeight: 18,
  },
  modeSegments: {
    flexDirection: "row",
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  modeSegment: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  modeSegmentActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  modeSegmentText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  modeSegmentTextActive: {
    color: colors.primary,
  },
  dateInputRow: {
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateInputRowError: {
    borderColor: colors.danger,
  },
  dateInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
    paddingVertical: 0,
  },
  calendarIcon: {
    fontSize: fontSize.xl,
    color: colors.textSubtle,
  },
  validationText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    lineHeight: 18,
  },
  btnPrimary: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primaryButton,
  },
  btnDisabled: {
    backgroundColor: colors.primaryDisabled,
  },
  btnPrimaryText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.extrabold,
    color: colors.surface,
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
    textTransform: "uppercase",
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 6,
  },
  emptyTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  emptyText: {
    fontSize: fontSize.base,
    lineHeight: 20,
    color: colors.textMuted,
  },
  reportResultWrapper: {
    gap: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 4,
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
  btnRefresh: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRefreshDisabled: {
    opacity: 0.55,
  },
  btnRefreshText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
  },
  btnRefreshTextDisabled: {
    color: colors.textSubtle,
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