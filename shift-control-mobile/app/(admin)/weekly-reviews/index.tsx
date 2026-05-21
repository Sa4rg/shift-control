import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { listStores } from "@/src/api/stores";
import { listUsers } from "@/src/api/users";
import {
  listWeeklyReviews,
  type ListWeeklyReviewsParams,
} from "@/src/api/weeklyReviews";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import { TextField } from "@/src/components/TextField";
import type {
  AdminUser,
  Store,
  WeeklyAdminReview,
  WeeklyAdminReviewStatus,
} from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
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

function ReviewRow({ review }: { review: WeeklyAdminReview }) {
  return (
    <Pressable
      style={styles.reviewRow}
      onPress={() => router.push(`/(admin)/weekly-reviews/${review.id}`)}
    >
      <View style={styles.reviewMain}>
        <Text style={styles.reviewTitle}>
          {review.staffName} · {review.status}
        </Text>
        <Text style={styles.reviewMeta}>{review.storeName}</Text>
        <Text style={styles.reviewMeta}>
          {review.weekStart} to {review.weekEnd}
        </Text>
        <Text style={styles.reviewMeta}>
          Sales: {formatMoney(review.totalSales)} · Incidents:{" "}
          {review.incidentCount}
        </Text>
        <Text style={styles.reviewMeta}>
          Created: {formatDateTime(review.createdAt)}
        </Text>
      </View>

      <Text style={styles.reviewAction}>View</Text>
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

  const [statusFilter, setStatusFilter] =
    useState<ReviewStatusFilter>("ALL");
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
            (user) => user.active && user.role === "STAFF"
          )
        : [],
    [referenceDataState]
  );

  const staffOptions = useMemo(() => {
    if (!selectedStoreId) {
      return activeStaffUsers;
    }

    return activeStaffUsers.filter((user) => user.storeId === selectedStoreId);
  }, [activeStaffUsers, selectedStoreId]);

  const selectedStore = useMemo(
    () => activeStores.find((store) => store.id === selectedStoreId) ?? null,
    [activeStores, selectedStoreId]
  );

  const selectedStaff = useMemo(
    () => staffOptions.find((user) => user.id === selectedStaffId) ?? null,
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
      void loadReviews();
    }, [loadReferenceData, loadReviews])
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

  if (referenceDataState.status === "loading" || state.status === "loading") {
    return <LoadingState message="Loading weekly reviews..." />;
  }

  const reviewedOkCount =
    state.status === "ready"
      ? state.reviews.filter((review) => review.status === "REVIEWED_OK")
          .length
      : 0;

  const reviewedWithIncidentCount =
    state.status === "ready"
      ? state.reviews.filter(
          (review) => review.status === "REVIEWED_WITH_INCIDENT"
        ).length
      : 0;

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Weekly reviews</Text>
            <Text style={styles.subtitle}>
              Review weekly admin snapshots by store and staff.
            </Text>
          </View>

          {referenceDataState.status === "error" ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Could not load filters</Text>
              <ErrorMessage message={referenceDataState.errorMessage} />
              <Button title="Try again" onPress={loadReferenceData} />
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Filters</Text>

            <Text style={styles.label}>Status</Text>
            <View style={styles.options}>
              {STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter}
                  title={filter === statusFilter ? `✓ ${filter}` : filter}
                  onPress={() => setStatusFilter(filter)}
                />
              ))}
            </View>

            {referenceDataState.status === "ready" ? (
              <>
                <Text style={styles.label}>Store</Text>
                <View style={styles.options}>
                  <Button
                    title={
                      selectedStoreId === null ? "✓ All stores" : "All stores"
                    }
                    onPress={() => handleSelectStore(null)}
                  />

                  {activeStores.map((store) => (
                    <Button
                      key={store.id}
                      title={
                        store.id === selectedStoreId
                          ? `✓ ${store.name}`
                          : store.name
                      }
                      onPress={() => handleSelectStore(store.id)}
                    />
                  ))}
                </View>

                {selectedStore ? (
                  <Text style={styles.helpText}>
                    Selected store: {selectedStore.name}
                  </Text>
                ) : null}

                <Text style={styles.label}>Staff</Text>
                <View style={styles.options}>
                  <Button
                    title={
                      selectedStaffId === null ? "✓ All staff" : "All staff"
                    }
                    onPress={() => setSelectedStaffId(null)}
                  />

                  {staffOptions.map((staff) => (
                    <Button
                      key={staff.id}
                      title={
                        staff.id === selectedStaffId
                          ? `✓ ${staff.fullName}`
                          : staff.fullName
                      }
                      onPress={() => setSelectedStaffId(staff.id)}
                    />
                  ))}
                </View>

                {selectedStaff ? (
                  <Text style={styles.helpText}>
                    Selected staff: {selectedStaff.fullName}
                  </Text>
                ) : null}
              </>
            ) : null}

            <TextField
              label="Week start"
              value={weekStart}
              onChangeText={setWeekStart}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />

            {weekStart.length > 0 && !isValidOptionalIsoDate(weekStart) ? (
              <Text style={styles.helpText}>
                Week start must use YYYY-MM-DD format.
              </Text>
            ) : null}

            <View style={styles.filterActions}>
              <Button
                title="Apply filters"
                onPress={loadReviews}
                disabled={!canLoadReviews}
              />
              <Button title="Clear filters" onPress={handleClearFilters} />
            </View>

            {state.status === "ready" ? (
              <Text style={styles.body}>
                OK: {reviewedOkCount} · With incident:{" "}
                {reviewedWithIncidentCount}
              </Text>
            ) : null}
          </View>

          {state.status === "error" ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Could not load reviews</Text>
              <ErrorMessage message={state.errorMessage} />
              <Button title="Try again" onPress={loadReviews} />
            </View>
          ) : null}

          {state.status === "ready" && state.reviews.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No weekly reviews found</Text>
              <Text style={styles.body}>
                There are no weekly reviews for the selected filters.
              </Text>
            </View>
          ) : null}

          {state.status === "ready" && state.reviews.length > 0 ? (
            <View style={styles.card}>
              {state.reviews.map((review) => (
                <ReviewRow key={review.id} review={review} />
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button
              title="Create weekly review"
              onPress={() => router.push("/(admin)/weekly-reviews/new-review")}
            />
            <Button title="Refresh" onPress={loadReviews} />
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
  filterActions: {
    gap: 8,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  reviewMain: {
    flex: 1,
    gap: 4,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  reviewMeta: {
    fontSize: 14,
    color: "#666666",
  },
  reviewAction: {
    fontSize: 14,
    fontWeight: "700",
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
});