import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { getWeeklyReviewById } from "@/src/api/weeklyReviews";
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type { WeeklyAdminReview } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { formatMoney } from "@/src/utils/money";
import { colors, commonStyles, fontWeight, fontSize, radius } from "@/src/theme";

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

function DetailRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string | null;
  valueStyle?: object;
}) {
  if (!value) {
    return null;
  }

  return (
    <View style={commonStyles.detailRow}>
      <Text style={commonStyles.detailLabel}>{label}</Text>
      <Text style={[commonStyles.detailValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function getTotalGlovo(review: WeeklyAdminReview): number {
  return review.totalGlovoOnline + review.totalGlovoCash;
}

function getReviewStatusCopy(review: WeeklyAdminReview) {
  if (review.status === "REVIEWED_OK") {
    return {
      title: "Weekly Review — Complete and Verified",
      body: "This weekly review was completed without incident.",
      isOk: true,
    };
  }

  return {
    title: "Weekly Review — Completed With Incident",
    body: "This weekly review was completed with an incident marker.",
    isOk: false,
  };
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

  const appBar = <AppTopBar variant="back" />;

  if (state.status === "error") {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        {appBar}

        <ScrollView
          contentContainerStyle={commonStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={commonStyles.card}>
            <View style={commonStyles.cardBody}>
              <Text style={commonStyles.sectionTitle}>Could not load review</Text>
              <ErrorMessage message={state.errorMessage} />

              <Pressable
                style={({ pressed }) => [
                  commonStyles.outlineButton,
                  pressed && commonStyles.buttonPressed,
                ]}
                onPress={loadReview}
              >
                <Text style={commonStyles.outlineButtonText}>Try again</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  commonStyles.btnBack,
                  pressed && commonStyles.buttonPressed,
                ]}
                onPress={() => router.back()}
              >
                <Text style={commonStyles.btnBackText}>← Back</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const review = state.review;
  const statusCopy = getReviewStatusCopy(review);

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      {appBar}

      <ScrollView
        contentContainerStyle={commonStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={commonStyles.pageHeader}>
          <Text style={commonStyles.pageTitle}>Weekly review detail</Text>
          <Text style={commonStyles.pageSubtitle}>
            REVIEW ID: #{review.id.slice(0, 8).toUpperCase()}
          </Text>
        </View>

        <View
          style={[
            styles.statusBanner,
            statusCopy.isOk
              ? styles.statusBannerOk
              : styles.statusBannerIncident,
          ]}
        >
          <Text
            style={[
              styles.statusBannerIcon,
              statusCopy.isOk
                ? styles.statusBannerIconOk
                : styles.statusBannerIconIncident,
            ]}
          >
            ✓
          </Text>

          <View style={styles.statusBannerTextGroup}>
            <Text
              style={[
                styles.statusBannerTitle,
                statusCopy.isOk
                  ? styles.statusBannerTitleOk
                  : styles.statusBannerTitleIncident,
              ]}
            >
              {statusCopy.title}
            </Text>
            <Text
              style={[
                styles.statusBannerBody,
                statusCopy.isOk
                  ? styles.statusBannerBodyOk
                  : styles.statusBannerBodyIncident,
              ]}
            >
              {statusCopy.body}
            </Text>
          </View>
        </View>

        <View style={commonStyles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>ⓘ</Text>
            <Text style={commonStyles.cardTitle}>Review context</Text>
          </View>

          <View style={commonStyles.cardBody}>
            <DetailRow label="Store" value={review.storeName} />
            <DetailRow label="Staff member" value={review.staffName} />
            <DetailRow label="Reviewed by" value={review.reviewedByName} />
            <DetailRow
              label="Week range"
              value={`${review.weekStart} - ${review.weekEnd}`}
            />
            <DetailRow
              label="Created at"
              value={formatDateTime(review.createdAt)}
            />
          </View>
        </View>

        <View style={commonStyles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>↗</Text>
            <Text style={commonStyles.cardTitle}>Sales totals</Text>
          </View>

          <View style={commonStyles.cardBody}>
            <View style={styles.totalSalesBlock}>
              <Text style={styles.totalSalesLabel}>Total sales</Text>
              <Text style={styles.totalSalesValue}>
                {formatMoney(review.totalSales)}
              </Text>
            </View>

            <View style={styles.cardDivider} />

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

            <View style={styles.totalGlovoRow}>
              <Text style={styles.totalGlovoLabel}>Total Glovo</Text>
              <Text style={styles.totalGlovoValue}>
                {formatMoney(getTotalGlovo(review))}
              </Text>
            </View>

            <DetailRow
              label="Pending invoice total"
              value={formatMoney(review.pendingInvoiceTotal)}
              valueStyle={
                review.pendingInvoiceTotal > 0 ? styles.warningValue : undefined
              }
            />
          </View>
        </View>

        <View style={commonStyles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>△</Text>
            <Text style={commonStyles.cardTitle}>Closures and incidents</Text>
          </View>

          <View style={commonStyles.cardBody}>
            <View style={styles.metricsGrid}>
              <MetricBox label="Closures" value={String(review.closuresCount)} />
              <MetricBox label="Incidents" value={String(review.incidentCount)} />
            </View>

            <View style={styles.cardDivider} />

            <DetailRow
              label="Cash difference total"
              value={formatMoney(review.cashDifferenceTotal)}
              valueStyle={
                review.cashDifferenceTotal === 0
                  ? styles.primaryValue
                  : styles.warningValue
              }
            />

            <DetailRow
              label="MB difference total"
              value={formatMoney(review.mbDifferenceTotal)}
              valueStyle={
                review.mbDifferenceTotal === 0
                  ? styles.primaryValue
                  : styles.warningValue
              }
            />
          </View>
        </View>

        {review.note ? (
          <View style={commonStyles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderIcon}>≡</Text>
              <Text style={commonStyles.cardTitle}>Review note</Text>
            </View>

            <View style={commonStyles.cardBody}>
              <View style={styles.noteBlock}>
                <Text style={styles.noteText}>{review.note}</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={commonStyles.actions}>
          <Pressable
            style={({ pressed }) => [
              commonStyles.btnRefresh,
              pressed && commonStyles.buttonPressed,
            ]}
            onPress={loadReview}
          >
            <Text style={commonStyles.btnRefreshText}>⟳ Refresh</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              commonStyles.btnBack,
              pressed && commonStyles.buttonPressed,
            ]}
            onPress={() => router.back()}
          >
            <Text style={commonStyles.btnBackText}>← Back</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  statusBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusBannerOk: {
    backgroundColor: colors.primarySoft,
    borderColor: "#b9ddd8",
  },
  statusBannerIncident: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
  },
  statusBannerIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.lg,
    textAlign: "center",
    textAlignVertical: "center",
    overflow: "hidden",
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.surface,
  },
  statusBannerIconOk: {
    backgroundColor: colors.primary,
  },
  statusBannerIconIncident: {
    backgroundColor: "#825100",
  },
  statusBannerTextGroup: {
    flex: 1,
    gap: 3,
  },
  statusBannerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.7,
  },
  statusBannerTitleOk: {
    color: colors.primary,
  },
  statusBannerTitleIncident: {
    color: colors.warning,
  },
  statusBannerBody: {
    fontSize: fontSize.md,
    lineHeight: 18,
  },
  statusBannerBodyOk: {
    color: colors.primary,
  },
  statusBannerBodyIncident: {
    color: colors.warning,
  },
  cardHeader: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  cardHeaderIcon: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  primaryValue: {
    color: colors.primary,
  },
  warningValue: {
    color: colors.warning,
  },
  totalSalesBlock: {
    gap: 4,
    paddingVertical: 4,
  },
  totalSalesLabel: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  totalSalesValue: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: 0.5,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.borderSoft,
  },
  totalGlovoRow: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  totalGlovoLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  totalGlovoValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  metricBox: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    gap: 5,
  },
  metricLabel: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  noteBlock: {
    borderLeftWidth: 4,
    borderLeftColor: "#b9ddd8",
    paddingLeft: 16,
    paddingVertical: 4,
  },
  noteText: {
    fontSize: fontSize.xl,
    lineHeight: 25,
    color: colors.textMuted,
    fontStyle: "italic",
  },
});