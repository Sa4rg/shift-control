import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { getWeeklyReviewById } from "@/src/api/weeklyReviews";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import type { WeeklyAdminReview } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { formatMoney } from "@/src/utils/money";

type ReviewDetailState =
  | {
      status: "loading";
      review: null;
      errorMessage: null;
    }
  | {
      status: "ready";
      review: WeeklyAdminReview;
      errorMessage: null;
    }
  | {
      status: "error";
      review: null;
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

function getTotalGlovo(review: WeeklyAdminReview): number {
  return review.totalGlovoOnline + review.totalGlovoCash;
}

export default function AdminWeeklyReviewDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const reviewId = params.id;

  const [state, setState] = useState<ReviewDetailState>({
    status: "loading",
    review: null,
    errorMessage: null,
  });

  const loadReview = useCallback(async () => {
    if (!reviewId) {
      setState({
        status: "error",
        review: null,
        errorMessage: "Weekly review id is missing.",
      });
      return;
    }

    setState({
      status: "loading",
      review: null,
      errorMessage: null,
    });

    try {
      const review = await getWeeklyReviewById(reviewId);

      setState({
        status: "ready",
        review,
        errorMessage: null,
      });
    } catch (error) {
      setState({
        status: "error",
        review: null,
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, [reviewId]);

  useEffect(() => {
    void loadReview();
  }, [loadReview]);

  if (state.status === "loading") {
    return <LoadingState message="Loading weekly review..." />;
  }

  if (state.status === "error") {
    return (
      <Screen>
        <View style={styles.container}>
          <Text style={styles.title}>Weekly review detail</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Could not load review</Text>
            <ErrorMessage message={state.errorMessage} />
            <Button title="Try again" onPress={loadReview} />
            <Button title="Back" onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  const review = state.review;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Weekly review detail</Text>
          <Text style={styles.subtitle}>Review {review.id.slice(0, 8)}</Text>
        </View>

        <View
          style={
            review.status === "REVIEWED_OK"
              ? styles.successCard
              : styles.warningCard
          }
        >
          <Text
            style={
              review.status === "REVIEWED_OK"
                ? styles.successTitle
                : styles.warningTitle
            }
          >
            {review.status === "REVIEWED_OK"
              ? "Reviewed OK"
              : "Reviewed with incident"}
          </Text>
          <Text
            style={
              review.status === "REVIEWED_OK"
                ? styles.successText
                : styles.warningText
            }
          >
            {review.status === "REVIEWED_OK"
              ? "This weekly review was completed without incident."
              : "This weekly review was completed with an incident marker."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Review context</Text>

          <DetailRow label="Store" value={review.storeName} />
          <DetailRow label="Staff" value={review.staffName} />
          <DetailRow label="Reviewed by" value={review.reviewedByName} />
          <DetailRow
            label="Week"
            value={`${review.weekStart} to ${review.weekEnd}`}
          />
          <DetailRow
            label="Created at"
            value={formatDateTime(review.createdAt)}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sales totals</Text>

          <DetailRow
            label="Total sales"
            value={formatMoney(review.totalSales)}
          />
          <DetailRow label="Cash" value={formatMoney(review.totalCash)} />
          <DetailRow label="MB" value={formatMoney(review.totalMb)} />
          <DetailRow
            label="Glovo online"
            value={formatMoney(review.totalGlovoOnline)}
          />
          <DetailRow
            label="Glovo cash"
            value={formatMoney(review.totalGlovoCash)}
          />
          <DetailRow
            label="Total Glovo"
            value={formatMoney(getTotalGlovo(review))}
          />
          <DetailRow
            label="Pending invoice"
            value={formatMoney(review.pendingInvoiceTotal)}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Closures and incidents</Text>

          <DetailRow label="Closures" value={String(review.closuresCount)} />
          <DetailRow label="Incidents" value={String(review.incidentCount)} />
          <DetailRow
            label="Cash difference total"
            value={formatMoney(review.cashDifferenceTotal)}
          />
          <DetailRow
            label="MB difference total"
            value={formatMoney(review.mbDifferenceTotal)}
          />
        </View>

        {review.note ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Review note</Text>
            <Text style={styles.body}>{review.note}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button title="Refresh" onPress={loadReview} />
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
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
});