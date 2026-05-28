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
import { listStores } from "@/src/api/stores";
import { listUsers } from "@/src/api/users";
import {
  listWeeklyReviews,
  type ListWeeklyReviewsParams,
} from "@/src/api/weeklyReviews";
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type {
  AdminUser,
  Store,
  WeeklyAdminReview,
  WeeklyAdminReviewStatus,
} from "@/src/types/api";
import { formatMoney } from "@/src/utils/money";
import { colors, fontWeight, fontSize, shadows, radius } from "@/src/theme";

type ReviewsState =
  | {
      status: "loading";
      reviews: WeeklyAdminReview[];
      errorMessage: null;
    }
  | {
      status: "ready";
      reviews: WeeklyAdminReview[];
      errorMessage: null;
    }
  | {
      status: "error";
      reviews: WeeklyAdminReview[];
      errorMessage: string;
    };

type ReferenceDataState =
  | {
      status: "loading";
      stores: Store[];
      staffUsers: AdminUser[];
      errorMessage: null;
    }
  | {
      status: "ready";
      stores: Store[];
      staffUsers: AdminUser[];
      errorMessage: null;
    }
  | {
      status: "error";
      stores: Store[];
      staffUsers: AdminUser[];
      errorMessage: string;
    };

type ReviewStatusFilter = "ALL" | WeeklyAdminReviewStatus;

const STATUS_FILTERS: ReviewStatusFilter[] = [
  "ALL",
  "REVIEWED_OK",
  "REVIEWED_WITH_INCIDENT",
];

function isValidOptionalIsoDate(value: string): boolean {
  if (value.trim().length === 0) {
    return true;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime());
}

function formatStatusLabel(status: ReviewStatusFilter): string {
  if (status === "ALL") {
    return "ALL";
  }

  if (status === "REVIEWED_OK") {
    return "REVIEWED OK";
  }

  return "WITH INCIDENT";
}

function getReviewStatusLabel(status: WeeklyAdminReviewStatus): string {
  return status === "REVIEWED_OK" ? "Reviewed OK" : "With Incident";
}

function StatusChip({
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
        styles.statusChip,
        selected && styles.statusChipActive,
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.statusChipText,
          selected && styles.statusChipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FilterChip({
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
        styles.filterChip,
        selected && styles.filterChipActive,
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          selected && styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ReviewStatusBadge({ status }: { status: WeeklyAdminReviewStatus }) {
  const isOk = status === "REVIEWED_OK";

  return (
    <View
      style={[
        styles.reviewStatusBadge,
        isOk ? styles.reviewStatusBadgeOk : styles.reviewStatusBadgeIncident,
      ]}
    >
      <Text
        style={[
          styles.reviewStatusBadgeText,
          isOk
            ? styles.reviewStatusBadgeTextOk
            : styles.reviewStatusBadgeTextIncident,
        ]}
      >
        {getReviewStatusLabel(status)}
      </Text>
    </View>
  );
}

function ReviewRow({
  review,
  isLast,
}: {
  review: WeeklyAdminReview;
  isLast: boolean;
}) {
  const hasIncident = review.status === "REVIEWED_WITH_INCIDENT";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.reviewRow,
        isLast && styles.reviewRowLast,
        hasIncident ? styles.reviewRowIncident : styles.reviewRowOk,
        pressed && styles.rowPressed,
      ]}
      onPress={() => router.push(`/(admin)/weekly-reviews/${review.id}`)}
    >
      <View style={styles.reviewMain}>
        <View style={styles.reviewTitleRow}>
          <Text style={styles.reviewStaffName}>{review.staffName}</Text>
          <ReviewStatusBadge status={review.status} />
        </View>

        <Text style={styles.reviewMeta}>
          {review.storeName} · {review.weekStart} to {review.weekEnd}
        </Text>

        <View style={styles.reviewSalesRow}>
          <Text style={styles.reviewSales}>{formatMoney(review.totalSales)}</Text>
          <Text style={styles.reviewSalesLabel}>Total Sales</Text>
        </View>
      </View>

      <View style={styles.reviewSide}>
        <Text style={styles.chevron}>›</Text>
        <View
          style={[
            styles.incidentsBadge,
            hasIncident
              ? styles.incidentsBadgeWarning
              : styles.incidentsBadgeNeutral,
          ]}
        >
          <Text
            style={[
              styles.incidentsBadgeText,
              hasIncident
                ? styles.incidentsBadgeTextWarning
                : styles.incidentsBadgeTextNeutral,
            ]}
          >
            {review.incidentCount}{" "}
            {review.incidentCount === 1 ? "Incident" : "Incidents"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function AdminWeeklyReviewsScreen() {
  const [referenceDataState, setReferenceDataState] =
    useState<ReferenceDataState>({
      status: "loading",
      stores: [],
      staffUsers: [],
      errorMessage: null,
    });

  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>("ALL");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState("");

  const [state, setState] = useState<ReviewsState>({
    status: "loading",
    reviews: [],
    errorMessage: null,
  });

  const canLoadReviews = isValidOptionalIsoDate(weekStart);

  const activeStores = useMemo(
    () =>
      referenceDataState.status === "ready"
        ? referenceDataState.stores.filter((store) => store.active)
        : [],
    [referenceDataState]
  );

  const activeStaffUsers = useMemo(
    () =>
      referenceDataState.status === "ready"
        ? referenceDataState.staffUsers.filter(
            (staffUser) => staffUser.active && staffUser.role === "STAFF"
          )
        : [],
    [referenceDataState]
  );

  const staffOptions = useMemo(() => {
    if (!selectedStoreId) {
      return activeStaffUsers;
    }

    return activeStaffUsers.filter(
      (staffUser) => staffUser.storeId === selectedStoreId
    );
  }, [activeStaffUsers, selectedStoreId]);

  const selectedStore = useMemo(
    () => activeStores.find((store) => store.id === selectedStoreId) ?? null,
    [activeStores, selectedStoreId]
  );

  const selectedStaff = useMemo(
    () => staffOptions.find((staffUser) => staffUser.id === selectedStaffId) ?? null,
    [staffOptions, selectedStaffId]
  );

  const loadReferenceData = useCallback(async () => {
    setReferenceDataState({
      status: "loading",
      stores: [],
      staffUsers: [],
      errorMessage: null,
    });

    try {
      const [stores, staffUsers] = await Promise.all([
        listStores(),
        listUsers({ role: "STAFF" }),
      ]);

      setReferenceDataState({
        status: "ready",
        stores,
        staffUsers,
        errorMessage: null,
      });
    } catch (error) {
      setReferenceDataState({
        status: "error",
        stores: [],
        staffUsers: [],
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, []);

  const fetchReviews = useCallback(async (params: ListWeeklyReviewsParams = {}) => {
    setState({
      status: "loading",
      reviews: [],
      errorMessage: null,
    });

    try {
      const reviews = await listWeeklyReviews(params);

      setState({
        status: "ready",
        reviews,
        errorMessage: null,
      });
    } catch (error) {
      setState({
        status: "error",
        reviews: [],
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, []);

  const loadReviews = useCallback(() => {
    if (!canLoadReviews) {
      return;
    }

    const params: ListWeeklyReviewsParams = {
      storeId: selectedStoreId ?? undefined,
      staffId: selectedStaffId ?? undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      weekStart: weekStart.trim().length > 0 ? weekStart.trim() : undefined,
    };

    void fetchReviews(params);
  }, [
    canLoadReviews,
    fetchReviews,
    selectedStoreId,
    selectedStaffId,
    statusFilter,
    weekStart,
  ]);

  useFocusEffect(
    useCallback(() => {
      void loadReferenceData();
      void fetchReviews({});
    }, [loadReferenceData, fetchReviews])
  );

  function handleSelectStore(storeId: string | null) {
    setSelectedStoreId(storeId);
    setSelectedStaffId(null);
  }

  function handleClearFilters() {
    setStatusFilter("ALL");
    setSelectedStoreId(null);
    setSelectedStaffId(null);
    setWeekStart("");
  }

  const reviewedOkCount =
    state.status === "ready"
      ? state.reviews.filter((review) => review.status === "REVIEWED_OK").length
      : 0;

  const reviewedWithIncidentCount =
    state.status === "ready"
      ? state.reviews.filter(
          (review) => review.status === "REVIEWED_WITH_INCIDENT"
        ).length
      : 0;

  if (referenceDataState.status === "loading" || state.status === "loading") {
    return <LoadingState message="Loading weekly reviews..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppTopBar variant="back" />

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
            <Text style={styles.pageTitle}>Weekly reviews</Text>
            <Text style={styles.pageSubtitle}>
              Manage and audit store performance logs for the current cycle.
            </Text>
          </View>

          {referenceDataState.status === "error" ? (
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <Text style={styles.sectionTitle}>Could not load filters</Text>
                <ErrorMessage message={referenceDataState.errorMessage} />

                <Pressable
                  style={({ pressed }) => [
                    styles.btnOutline,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={loadReferenceData}
                >
                  <Text style={styles.btnOutlineText}>Try again</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.filterCard}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>STATUS</Text>

              <View style={styles.statusChips}>
                {STATUS_FILTERS.map((filter) => (
                  <StatusChip
                    key={filter}
                    label={formatStatusLabel(filter)}
                    selected={filter === statusFilter}
                    onPress={() => setStatusFilter(filter)}
                  />
                ))}
              </View>
            </View>

            {referenceDataState.status === "ready" ? (
              <>
                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>STORE</Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalChips}
                  >
                    <FilterChip
                      label="All Stores"
                      selected={selectedStoreId === null}
                      onPress={() => handleSelectStore(null)}
                    />

                    {activeStores.map((store) => (
                      <FilterChip
                        key={store.id}
                        label={store.name}
                        selected={store.id === selectedStoreId}
                        onPress={() => handleSelectStore(store.id)}
                      />
                    ))}
                  </ScrollView>

                  {selectedStore ? (
                    <Text style={styles.helperText}>
                      Selected store: {selectedStore.name}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>STAFF</Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalChips}
                  >
                    <FilterChip
                      label="All Staff"
                      selected={selectedStaffId === null}
                      onPress={() => setSelectedStaffId(null)}
                    />

                    {staffOptions.map((staffUser) => (
                      <FilterChip
                        key={staffUser.id}
                        label={staffUser.fullName}
                        selected={staffUser.id === selectedStaffId}
                        onPress={() => setSelectedStaffId(staffUser.id)}
                      />
                    ))}
                  </ScrollView>

                  {selectedStaff ? (
                    <Text style={styles.helperText}>
                      Selected staff: {selectedStaff.fullName}
                    </Text>
                  ) : null}
                </View>
              </>
            ) : null}

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>WEEK START DATE</Text>

              <View
                style={[
                  styles.dateInputRow,
                  weekStart.length > 0 &&
                    !isValidOptionalIsoDate(weekStart) &&
                    styles.dateInputRowError,
                ]}
              >
                <Text style={styles.calendarIcon}>□</Text>
                <TextInput
                  style={styles.dateInput}
                  value={weekStart}
                  onChangeText={setWeekStart}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#6d7a77"
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {weekStart.length > 0 && !isValidOptionalIsoDate(weekStart) ? (
                <Text style={styles.validationText}>
                  Week start must use YYYY-MM-DD format.
                </Text>
              ) : null}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.btnPrimary,
                !canLoadReviews && styles.btnDisabled,
                pressed && canLoadReviews && styles.buttonPressed,
              ]}
              onPress={loadReviews}
              disabled={!canLoadReviews}
            >
              <Text style={styles.btnPrimaryText}>⟳ Load reviews</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnClear,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleClearFilters}
            >
              <Text style={styles.btnClearText}>Clear filters</Text>
            </Pressable>

            {state.status === "ready" ? (
              <Text style={styles.resultSummary}>
                OK: {reviewedOkCount} · With incident:{" "}
                {reviewedWithIncidentCount}
              </Text>
            ) : null}
          </View>

          {state.status === "error" ? (
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <Text style={styles.sectionTitle}>Could not load reviews</Text>
                <ErrorMessage message={state.errorMessage} />

                <Pressable
                  style={({ pressed }) => [
                    styles.btnOutline,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={loadReviews}
                >
                  <Text style={styles.btnOutlineText}>Try again</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {state.status === "ready" ? (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                RESULTS ({state.reviews.length})
              </Text>
              <Text style={styles.sortText}>Sort: Date</Text>
            </View>
          ) : null}

          {state.status === "ready" && state.reviews.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No weekly reviews found</Text>
              <Text style={styles.emptyText}>
                There are no weekly reviews for the selected filters.
              </Text>
            </View>
          ) : null}

          {state.status === "ready" && state.reviews.length > 0 ? (
            <View style={styles.resultsCard}>
              {state.reviews.map((review, index) => (
                <ReviewRow
                  key={review.id}
                  review={review}
                  isLast={index === state.reviews.length - 1}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.btnPrimary,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push("/(admin)/weekly-reviews/new-review")}
            >
              <Text style={styles.btnPrimaryText}>+ New review</Text>
            </Pressable>

            <View style={styles.actionRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.btnRefresh,
                  pressed && styles.buttonPressed,
                ]}
                onPress={loadReviews}
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
    gap: 14,
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
  statusChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  statusChipActive: {
    backgroundColor: colors.primary,
    borderColor: "#00685f",
  },
  statusChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  statusChipTextActive: {
    color: colors.surface,
  },
  horizontalChips: {
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  filterChipActive: {
    backgroundColor: "#f2fffc",
    borderColor: "#00685f",
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.textSubtle,
    lineHeight: 18,
  },
  dateInputRow: {
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateInputRowError: {
    borderColor: colors.danger,
  },
  calendarIcon: {
    fontSize: fontSize.lg,
    color: colors.textSubtle,
  },
  dateInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
    paddingVertical: 0,
  },
  validationText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    lineHeight: 18,
  },
  resultSummary: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  resultsHeader: {
    paddingHorizontal: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  sortText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  resultsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.card,
  },
  reviewRow: {
    minHeight: 112,
    padding: 16,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  reviewRowLast: {
    borderBottomWidth: 0,
  },
  reviewRowOk: {
    borderLeftColor: "#00685f",
  },
  reviewRowIncident: {
    borderLeftColor: "#a36700",
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  reviewMain: {
    flex: 1,
    gap: 6,
  },
  reviewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },
  reviewStaffName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  reviewStatusBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  reviewStatusBadgeOk: {
    backgroundColor: colors.primaryMuted,
  },
  reviewStatusBadgeIncident: {
    backgroundColor: "#ffddb8",
  },
  reviewStatusBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.extrabold,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  reviewStatusBadgeTextOk: {
    color: colors.primaryDark,
  },
  reviewStatusBadgeTextIncident: {
    color: "#653e00",
  },
  reviewMeta: {
    fontSize: fontSize.md,
    lineHeight: 18,
    color: colors.textMuted,
  },
  reviewSalesRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 2,
  },
  reviewSales: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  reviewSalesLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  reviewSide: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  chevron: {
    fontSize: 24,
    color: colors.textMuted,
  },
  incidentsBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  incidentsBadgeNeutral: {
    backgroundColor: colors.secondarySoft,
  },
  incidentsBadgeWarning: {
    backgroundColor: "#ffddb8",
    borderWidth: 1,
    borderColor: "#ffb95f",
  },
  incidentsBadgeText: {
    fontSize: 11,
    fontWeight: fontWeight.extrabold,
  },
  incidentsBadgeTextNeutral: {
    color: colors.textMuted,
  },
  incidentsBadgeTextWarning: {
    color: "#653e00",
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
  actions: {
    gap: 10,
    paddingTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
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
  btnClear: {
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  btnClearText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  btnRefresh: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: "#89f5e7",
    alignItems: "center",
    justifyContent: "center",
  },
  btnRefreshText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.extrabold,
    color: colors.primaryDark,
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