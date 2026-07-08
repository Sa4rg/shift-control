import { router, useFocusEffect } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
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
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { DatePickerField } from "@/src/components/DatePickerField";
import { DailyReportView } from "@/src/features/admin/reports/DailyReportView";
import { MonthlyReportView } from "@/src/features/admin/reports/MonthlyReportView";
import { loadWeeklyReviewsByStaffId } from "@/src/features/admin/reports/loadWeeklyReviewsByStaffId";
import {
  isValidIsoDate,
  isValidYearMonth,
} from "@/src/features/admin/reports/reportDateUtils";
import { WeeklyReportView } from "@/src/features/admin/reports/WeeklyReportView";
import {
  getCreateWeeklyReviewRoute,
  getWeeklyReviewDetailRoute,
} from "@/src/features/admin/reports/weeklyReviewNavigation";
import type {
  DailyReport,
  MonthlyReport,
  Store,
  WeeklyReport,
  WeeklyAdminReview,
} from "@/src/types/api";
import { colors, commonStyles, fontWeight, fontSize, radius } from "@/src/theme";
import { AppTopBar } from "@/src/components/AppTopBar";

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

type WeeklyReviewsState =
  | {
      status: "idle";
      reviewsByStaffId: Map<string, WeeklyAdminReview>;
      errorMessage: null;
    }
  | {
      status: "loading";
      reviewsByStaffId: Map<string, WeeklyAdminReview>;
      errorMessage: null;
    }
  | {
      status: "ready";
      reviewsByStaffId: Map<string, WeeklyAdminReview>;
      errorMessage: null;
    }
  | {
      status: "error";
      reviewsByStaffId: Map<string, WeeklyAdminReview>;
      errorMessage: string;
    };

    type LoadedWeeklyReportContext = {
      storeId: string;
      weekStart: string;
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
        pressed && commonStyles.buttonPressed,
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
        pressed && commonStyles.buttonPressed,
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
  const [weeklyReviewsState, setWeeklyReviewsState] =
  useState<WeeklyReviewsState>({
    status: "idle",
    reviewsByStaffId: new Map(),
    errorMessage: null,
  });

  const loadedWeeklyReportContextRef =
  useRef<LoadedWeeklyReportContext | null>(null);

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

  const refreshLoadedWeeklyReviews = useCallback(
    async ({
      storeId,
      weekStart: loadedWeekStart,
    }: LoadedWeeklyReportContext) => {
      setWeeklyReviewsState((currentState) => ({
        status: "loading",
        reviewsByStaffId: currentState.reviewsByStaffId,
        errorMessage: null,
      }));

      try {
        const reviewsByStaffId = await loadWeeklyReviewsByStaffId({
          storeId,
          weekStart: loadedWeekStart,
        });

        setWeeklyReviewsState({
          status: "ready",
          reviewsByStaffId,
          errorMessage: null,
        });
      } catch (error) {
        setWeeklyReviewsState((currentState) => ({
          status: "error",
          reviewsByStaffId: currentState.reviewsByStaffId,
          errorMessage: getApiErrorMessage(error),
        }));
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      void loadStores();

      const loadedWeeklyReportContext =
        loadedWeeklyReportContextRef.current;

      if (loadedWeeklyReportContext) {
        void refreshLoadedWeeklyReviews(
          loadedWeeklyReportContext
        );
      }
    }, [loadStores, refreshLoadedWeeklyReviews])
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

    setWeeklyReviewsState({
      status: "idle",
      reviewsByStaffId: new Map(),
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

    setWeeklyReviewsState({
      status: reportMode === "WEEKLY" ? "loading" : "idle",
      reviewsByStaffId: new Map(),
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

        try {
          const reviewsByStaffId = await loadWeeklyReviewsByStaffId({
            storeId: selectedStoreId,
            weekStart,
          });

          setWeeklyReviewsState({
            status: "ready",
            reviewsByStaffId,
            errorMessage: null,
          });
        } catch (error) {
          setWeeklyReviewsState({
            status: "error",
            reviewsByStaffId: new Map(),
            errorMessage: getApiErrorMessage(error),
          });
        }

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

  function getDateLabel(): string {
    if (reportMode === "DAILY") {
      return "Select Date";
    }

    if (reportMode === "WEEKLY") {
      return "Week start";
    }

    return "Select Month";
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

  const weeklyReport =
    reportState.status === "ready" ? reportState.weeklyReport : null;

  useEffect(() => {
    if (!weeklyReport) {
      loadedWeeklyReportContextRef.current = null;
      return;
    }

    loadedWeeklyReportContextRef.current = {
      storeId: weeklyReport.storeId,
      weekStart: weeklyReport.weekStart,
    };
  }, [weeklyReport]);

  if (storesState.status === "loading") {
    return <LoadingState message="Loading stores..." />;
  }

  const validationMessage = getDateValidationMessage();

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <AppTopBar variant="back" />
        <ScrollView
          contentContainerStyle={commonStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={commonStyles.pageHeader}>
            <Text style={commonStyles.pageTitle}>Reports</Text>
            <Text style={commonStyles.pageSubtitle}>
              Generate store reports for admin review.
            </Text>
          </View>

          {storesState.status === "error" ? (
            <View style={commonStyles.card}>
              <View style={commonStyles.cardBody}>
                <Text style={commonStyles.sectionLabel}>Could not load stores</Text>
                <ErrorMessage message={storesState.errorMessage} />

                <Pressable
                  style={({ pressed }) => [
                    commonStyles.outlineButton,
                    pressed && commonStyles.buttonPressed,
                  ]}
                  onPress={loadStores}
                >
                  <Text style={commonStyles.outlineButtonText}>Try again</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {storesState.status === "ready" && storesState.stores.length === 0 ? (
            <View style={commonStyles.emptyCard}>
              <Text style={commonStyles.emptyTitle}>No active stores</Text>
              <Text style={commonStyles.emptyText}>
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
                    <Text style={commonStyles.helpText}>
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
                  {reportMode === "MONTHLY" ? (
                    <>
                      <Text style={styles.filterLabel}>{getDateLabel()}</Text>

                      <View
                        style={[
                          styles.dateInputRow,
                          validationMessage && styles.dateInputRowError,
                        ]}
                      >
                        <TextInput
                          style={styles.dateInput}
                          value={month}
                          onChangeText={setMonth}
                          placeholder="YYYY-MM"
                          placeholderTextColor="#6d7a77"
                          keyboardType="numbers-and-punctuation"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />

                        <Text style={styles.calendarIcon}>□</Text>
                      </View>
                    </>
                  ) : (
                    <DatePickerField
                      label={reportMode === "DAILY" ? "Select Date" : "Week start"}
                      value={reportMode === "DAILY" ? date : weekStart}
                      onChange={reportMode === "DAILY" ? setDate : setWeekStart}
                      placeholder={
                        reportMode === "DAILY"
                          ? "Select report date"
                          : "Select week start"
                      }
                    />
                  )}

                  {reportMode === "WEEKLY" ? (
                    <Text style={commonStyles.helpText}>
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
                    commonStyles.primaryButton,
                    !canLoadReport && commonStyles.buttonDisabled,
                    pressed && canLoadReport && commonStyles.buttonPressed,
                  ]}
                  onPress={handleLoadReport}
                  disabled={!canLoadReport}
                >
                  <Text style={commonStyles.primaryButtonText}>
                    {reportState.status === "loading"
                      ? "Loading…"
                      : "▣ Load report"}
                  </Text>
                </Pressable>
              </View>

              {reportState.status === "error" ? (
                <View style={commonStyles.card}>
                  <View style={commonStyles.cardBody}>
                    <Text style={commonStyles.sectionLabel}>Could not load report</Text>
                    <ErrorMessage message={reportState.errorMessage} />
                  </View>
                </View>
              ) : null}

              {reportState.status === "idle" ? (
                <View style={commonStyles.emptyCard}>
                  <Text style={commonStyles.emptyTitle}>No report loaded</Text>
                  <Text style={commonStyles.emptyText}>
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

              {weeklyReport ? (
                <View style={styles.reportResultWrapper}>
                <WeeklyReportView
                  report={weeklyReport}
                  storeName={selectedStore?.name ?? "Selected store"}
                  reviewsByStaffId={weeklyReviewsState.reviewsByStaffId}
                  reviewActionsEnabled={weeklyReviewsState.status === "ready"}
                  onCreateReview={(staff) => {
                    router.push(
                      getCreateWeeklyReviewRoute({
                        storeId: weeklyReport.storeId,
                        staffId: staff.staffId,
                        weekStart: weeklyReport.weekStart,
                      })
                    );
                  }}
                  onViewReview={(reviewId) => {
                    router.push(getWeeklyReviewDetailRoute(reviewId) as never);
                  }}
                />
                </View>
              ) : null}

              {reportState.status === "ready" &&
                weeklyReviewsState.status === "loading" ? (
                  <View style={styles.reviewStatusCard}>
                    <Text style={styles.reviewStatusText}>
                      Loading existing weekly reviews…
                    </Text>
                  </View>
                ) : null}

                {reportState.status === "ready" &&
                weeklyReviewsState.status === "error" ? (
                  <View style={styles.reviewStatusCard}>
                    <ErrorMessage
                      message={`The report loaded correctly, but existing weekly reviews could not be checked. ${weeklyReviewsState.errorMessage}`}
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

          <View style={commonStyles.actions}>
            <Pressable
              style={({ pressed }) => [
                commonStyles.btnBack,
                pressed && commonStyles.buttonPressed,
              ]}
              onPress={() => router.back()}
            >
              <Text style={commonStyles.btnBackText}>← Back</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                commonStyles.btnRefresh,
                !canLoadReport && styles.btnRefreshDisabled,
                pressed && canLoadReport && commonStyles.buttonPressed,
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  filterCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 16,
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
  reportResultWrapper: {
    gap: 12,
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
  reviewStatusCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  reviewStatusText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
});