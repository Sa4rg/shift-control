import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect } from "react";
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
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type { WeeklyAdminReview } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { formatMoney } from "@/src/utils/money";
import { useState } from "react";

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
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueStyle]}>{value}</Text>
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
  const { user } = useAuth();
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

  const displayName = user?.fullName ?? user?.username ?? "Admin";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (state.status === "loading") {
    return <LoadingState message="Loading weekly review..." />;
  }

  const appBar = (
    <View style={styles.appBar}>
      <View style={styles.appBarLeft}>
        <Pressable
          style={({ pressed }) => [
            styles.appBarBackButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <Text style={styles.appBarTitle}>Weekly review detail</Text>
      </View>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    </View>
  );

  if (state.status === "error") {
    return (
      <SafeAreaView style={styles.safeArea}>
        {appBar}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.sectionTitle}>Could not load review</Text>
              <ErrorMessage message={state.errorMessage} />

              <Pressable
                style={({ pressed }) => [
                  styles.btnOutline,
                  pressed && styles.buttonPressed,
                ]}
                onPress={loadReview}
              >
                <Text style={styles.btnOutlineText}>Try again</Text>
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
      </SafeAreaView>
    );
  }

  const review = state.review;
  const statusCopy = getReviewStatusCopy(review);

  return (
    <SafeAreaView style={styles.safeArea}>
      {appBar}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Weekly review detail</Text>
          <Text style={styles.pageSubtitle}>
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

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>ⓘ</Text>
            <Text style={styles.cardTitle}>Review context</Text>
          </View>

          <View style={styles.cardBody}>
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

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>↗</Text>
            <Text style={styles.cardTitle}>Sales totals</Text>
          </View>

          <View style={styles.cardBody}>
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

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>△</Text>
            <Text style={styles.cardTitle}>Closures and incidents</Text>
          </View>

          <View style={styles.cardBody}>
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
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderIcon}>≡</Text>
              <Text style={styles.cardTitle}>Review note</Text>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.noteBlock}>
                <Text style={styles.noteText}>{review.note}</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.btnRefresh,
              pressed && styles.buttonPressed,
            ]}
            onPress={loadReview}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#faf8ff",
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
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  appBarBackButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 20,
    fontWeight: "700",
    color: "#00685f",
  },
  appBarTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#131b2e",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#00685f",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#ffffff",
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
    fontSize: 20,
    fontWeight: "900",
    color: "#00685f",
  },
  pageSubtitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#3d4947",
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#131b2e",
  },
  statusBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusBannerOk: {
    backgroundColor: "#edf8f6",
    borderColor: "#b9ddd8",
  },
  statusBannerIncident: {
    backgroundColor: "#fff8e6",
    borderColor: "#f0d8a0",
  },
  statusBannerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: "center",
    textAlignVertical: "center",
    overflow: "hidden",
    fontSize: 15,
    fontWeight: "900",
    color: "#ffffff",
  },
  statusBannerIconOk: {
    backgroundColor: "#00685f",
  },
  statusBannerIconIncident: {
    backgroundColor: "#825100",
  },
  statusBannerTextGroup: {
    flex: 1,
    gap: 3,
  },
  statusBannerTitle: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  statusBannerTitleOk: {
    color: "#00685f",
  },
  statusBannerTitleIncident: {
    color: "#825100",
  },
  statusBannerBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  statusBannerBodyOk: {
    color: "#00685f",
  },
  statusBannerBodyIncident: {
    color: "#825100",
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
  cardHeader: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  cardHeaderIcon: {
    fontSize: 14,
    fontWeight: "900",
    color: "#00685f",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#131b2e",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  cardBody: {
    padding: 16,
    gap: 12,
  },
  detailRow: {
    minHeight: 34,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: "#3d4947",
  },
  detailValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#131b2e",
    textAlign: "right",
  },
  primaryValue: {
    color: "#00685f",
  },
  warningValue: {
    color: "#825100",
  },
  totalSalesBlock: {
    gap: 4,
    paddingVertical: 4,
  },
  totalSalesLabel: {
    fontSize: 14,
    color: "#3d4947",
  },
  totalSalesValue: {
    fontSize: 30,
    fontWeight: "900",
    color: "#00685f",
    letterSpacing: 0.5,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#eaedff",
  },
  totalGlovoRow: {
    borderRadius: 10,
    backgroundColor: "#f2f3ff",
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  totalGlovoLabel: {
    fontSize: 14,
    fontWeight: "900",
    color: "#00685f",
  },
  totalGlovoValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#00685f",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  metricBox: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#f2f3ff",
    padding: 14,
    gap: 5,
  },
  metricLabel: {
    fontSize: 13,
    color: "#3d4947",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#131b2e",
  },
  noteBlock: {
    borderLeftWidth: 4,
    borderLeftColor: "#b9ddd8",
    paddingLeft: 16,
    paddingVertical: 4,
  },
  noteText: {
    fontSize: 16,
    lineHeight: 25,
    color: "#3d4947",
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 4,
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