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
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type {
  AdminUser,
  Store,
  WeeklyAdminReview,
  WeeklyAdminReviewStatus,
} from "@/src/types/api";
import { formatMoney } from "@/src/utils/money";

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
  const { user } = useAuth();

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
    status: "ready",
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

  const loadReviews = useCallback(async () => {
    if (!canLoadReviews) {
      return;
    }

    setState({
      status: "loading",
      reviews: [],
      errorMessage: null,
    });

    const params: ListWeeklyReviewsParams = {
      storeId: selectedStoreId ?? undefined,
      staffId: selectedStaffId ?? undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      weekStart: weekStart.trim().length > 0 ? weekStart.trim() : undefined,
    };

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
  }, [
    canLoadReviews,
    selectedStoreId,
    selectedStaffId,
    statusFilter,
    weekStart,
  ]);

  useFocusEffect(
    useCallback(() => {
      void loadReferenceData();
    }, [loadReferenceData])
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

  const displayName = user?.fullName ?? user?.username ?? "Admin";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (referenceDataState.status === "loading" || state.status === "loading") {
    return <LoadingState message="Loading weekly reviews..." />;
  }

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
    backgroundColor: "#faf8ff",
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
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
  },
  appBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  menuIcon: {
    fontSize: 20,
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
  pageHeader: {
    gap: 5,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#131b2e",
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 15,
    color: "#3d4947",
    lineHeight: 22,
  },
  filterCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    padding: 16,
    gap: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#6d7a77",
    letterSpacing: 0.9,
  },
  statusChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: "#f2f3ff",
    borderWidth: 1,
    borderColor: "#eaedff",
  },
  statusChipActive: {
    backgroundColor: "#00685f",
    borderColor: "#00685f",
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#3d4947",
  },
  statusChipTextActive: {
    color: "#ffffff",
  },
  horizontalChips: {
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: "#f2f3ff",
    borderWidth: 1,
    borderColor: "#eaedff",
  },
  filterChipActive: {
    backgroundColor: "#f2fffc",
    borderColor: "#00685f",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#3d4947",
  },
  filterChipTextActive: {
    color: "#00685f",
  },
  helperText: {
    fontSize: 12,
    color: "#6d7a77",
    lineHeight: 18,
  },
  dateInputRow: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bcc9c6",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateInputRowError: {
    borderColor: "#ba1a1a",
  },
  calendarIcon: {
    fontSize: 15,
    color: "#6d7a77",
  },
  dateInput: {
    flex: 1,
    fontSize: 14,
    color: "#131b2e",
    paddingVertical: 0,
  },
  validationText: {
    fontSize: 12,
    color: "#ba1a1a",
    lineHeight: 18,
  },
  resultSummary: {
    fontSize: 13,
    color: "#3d4947",
  },
  resultsHeader: {
    paddingHorizontal: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultsTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#3d4947",
    letterSpacing: 1,
  },
  sortText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#00685f",
  },
  resultsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewRow: {
    minHeight: 112,
    padding: 16,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
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
    backgroundColor: "#f2f3ff",
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
    fontSize: 15,
    fontWeight: "900",
    color: "#131b2e",
  },
  reviewStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  reviewStatusBadgeOk: {
    backgroundColor: "#d2f5f0",
  },
  reviewStatusBadgeIncident: {
    backgroundColor: "#ffddb8",
  },
  reviewStatusBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  reviewStatusBadgeTextOk: {
    color: "#005049",
  },
  reviewStatusBadgeTextIncident: {
    color: "#653e00",
  },
  reviewMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: "#3d4947",
  },
  reviewSalesRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 2,
  },
  reviewSales: {
    fontSize: 16,
    fontWeight: "900",
    color: "#131b2e",
  },
  reviewSalesLabel: {
    fontSize: 12,
    color: "#3d4947",
  },
  reviewSide: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  chevron: {
    fontSize: 24,
    color: "#3d4947",
  },
  incidentsBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  incidentsBadgeNeutral: {
    backgroundColor: "#dde1ff",
  },
  incidentsBadgeWarning: {
    backgroundColor: "#ffddb8",
    borderWidth: 1,
    borderColor: "#ffb95f",
  },
  incidentsBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  incidentsBadgeTextNeutral: {
    color: "#3d4947",
  },
  incidentsBadgeTextWarning: {
    color: "#653e00",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardBody: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#00685f",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    padding: 18,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#131b2e",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#3d4947",
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
    height: 48,
    borderRadius: 12,
    backgroundColor: "#00685f",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    backgroundColor: "#9ecbc7",
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#ffffff",
  },
  btnClear: {
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  btnClearText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#00685f",
  },
  btnRefresh: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#89f5e7",
    alignItems: "center",
    justifyContent: "center",
  },
  btnRefreshText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#005049",
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