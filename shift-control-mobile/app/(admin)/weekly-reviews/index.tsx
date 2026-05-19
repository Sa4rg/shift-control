import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { listWeeklyReviews } from "@/src/api/weeklyReviews";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import type {
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

type ReviewStatusFilter = "ALL" | WeeklyAdminReviewStatus;

const STATUS_FILTERS: ReviewStatusFilter[] = [
  "ALL",
  "REVIEWED_OK",
  "REVIEWED_WITH_INCIDENT",
];

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
  const [statusFilter, setStatusFilter] =
    useState<ReviewStatusFilter>("ALL");
  const [state, setState] = useState<ReviewsState>({
    status: "loading",
    reviews: [],
    errorMessage: null,
  });

  const loadReviews = useCallback(async () => {
    setState({
      status: "loading",
      reviews: [],
      errorMessage: null,
    });

    try {
      const reviews = await listWeeklyReviews();

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

  useFocusEffect(
    useCallback(() => {
      void loadReviews();
    }, [loadReviews])
  );

  const filteredReviews = useMemo(() => {
    if (state.status !== "ready") {
      return [];
    }

    if (statusFilter === "ALL") {
      return state.reviews;
    }

    return state.reviews.filter((review) => review.status === statusFilter);
  }, [state, statusFilter]);

  const reviewedOkCount = useMemo(
    () =>
      state.status === "ready"
        ? state.reviews.filter((review) => review.status === "REVIEWED_OK")
            .length
        : 0,
    [state]
  );

  const reviewedWithIncidentCount = useMemo(
    () =>
      state.status === "ready"
        ? state.reviews.filter(
            (review) => review.status === "REVIEWED_WITH_INCIDENT"
          ).length
        : 0,
    [state]
  );

  if (state.status === "loading") {
    return <LoadingState message="Loading weekly reviews..." />;
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Weekly reviews</Text>
          <Text style={styles.subtitle}>
            Review weekly admin snapshots by store and staff.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Filter</Text>

          <View style={styles.options}>
            {STATUS_FILTERS.map((filter) => (
              <Button
                key={filter}
                title={filter === statusFilter ? `✓ ${filter}` : filter}
                onPress={() => setStatusFilter(filter)}
              />
            ))}
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

        {state.status === "ready" && filteredReviews.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No weekly reviews found</Text>
            <Text style={styles.body}>
              There are no weekly reviews for the selected filter.
            </Text>
          </View>
        ) : null}

        {state.status === "ready" && filteredReviews.length > 0 ? (
          <View style={styles.card}>
            {filteredReviews.map((review) => (
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
  options: {
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