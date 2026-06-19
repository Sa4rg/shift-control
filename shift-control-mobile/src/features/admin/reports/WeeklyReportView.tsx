import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  WeeklyAdminReview,
  WeeklyReport,
} from "@/src/types/api";
import { formatMoney } from "@/src/utils/money";

import { getWeeklyStaffTotalGlovo, getWeeklyTotals } from "./reportTotals";
import { SummaryRow } from "./SummaryRow";

import { getWeeklyStaffReviewAction } from "./getWeeklyStaffReviewAction";

type WeeklyStaffSummary = WeeklyReport["staffSummaries"][number];

type WeeklyReportViewProps = {
  report: WeeklyReport;
  storeName: string;
  reviewsByStaffId: Map<string, WeeklyAdminReview>;
  reviewActionsEnabled: boolean;
  onCreateReview: (staff: WeeklyStaffSummary) => void;
  onViewReview: (reviewId: string) => void;
};

export function WeeklyReportView({
  report,
  storeName,
  reviewsByStaffId,
  reviewActionsEnabled,
  onCreateReview,
  onViewReview,
}: WeeklyReportViewProps) {
  const totals = getWeeklyTotals(report);

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Weekly report · {report.weekStart} to {report.weekEnd}
        </Text>
        <Text style={styles.body}>{storeName}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly totals</Text>

        <SummaryRow
          label="Total sales"
          value={formatMoney(totals.totalSales)}
        />
        <SummaryRow label="Cash" value={formatMoney(totals.totalCash)} />
        <SummaryRow label="MB" value={formatMoney(totals.totalMb)} />
        <SummaryRow
          label="Glovo online"
          value={formatMoney(totals.totalGlovoOnline)}
        />
        <SummaryRow
          label="Glovo cash"
          value={formatMoney(totals.totalGlovoCash)}
        />
        <SummaryRow
          label="Total Glovo"
          value={formatMoney(totals.totalGlovoOnline + totals.totalGlovoCash)}
        />
        <SummaryRow
          label="Pending invoice"
          value={formatMoney(totals.pendingInvoiceTotal)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Closures and incidents</Text>

        <SummaryRow
          label="Closures"
          value={String(totals.closuresCount)}
        />
        <SummaryRow
          label="Incidents"
          value={String(totals.incidentCount)}
        />
        <SummaryRow
          label="Cash difference total"
          value={formatMoney(totals.cashDifferenceTotal)}
        />
        <SummaryRow
          label="MB difference total"
          value={formatMoney(totals.mbDifferenceTotal)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Staff summaries</Text>

        {report.staffSummaries.length === 0 ? (
          <Text style={styles.body}>No staff summaries for this week.</Text>
        ) : (
          <View style={styles.staffList}>
          {report.staffSummaries.map((staff) => {
            const reviewAction = getWeeklyStaffReviewAction({
              staffId: staff.staffId,
              reviewsByStaffId,
            });

            return (
              <View key={staff.staffId} style={styles.staffRow}>
                <Text style={styles.staffTitle}>{staff.staffName}</Text>

                <Text style={styles.staffMeta}>Store: {staff.storeName}</Text>

                <Text style={styles.staffMeta}>
                  Sales: {formatMoney(staff.totalSales)}
                </Text>

                <Text style={styles.staffMeta}>
                  Cash: {formatMoney(staff.totalCash)} · MB:{" "}
                  {formatMoney(staff.totalMb)}
                </Text>

                <Text style={styles.staffMeta}>
                  Glovo: {formatMoney(getWeeklyStaffTotalGlovo(staff))}
                </Text>

                <Text style={styles.staffMeta}>
                  Closures: {staff.closuresCount} · Incidents:{" "}
                  {staff.incidentCount}
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.reviewButton,
                    reviewAction.type === "VIEW" && styles.reviewButtonExisting,
                    !reviewActionsEnabled && styles.reviewButtonDisabled,
                    pressed && reviewActionsEnabled && styles.buttonPressed,
                  ]}
                  disabled={!reviewActionsEnabled}
                  onPress={() => {
                    if (reviewAction.type === "VIEW") {
                      onViewReview(reviewAction.reviewId);
                      return;
                    }

                    onCreateReview(staff);
                  }}
                >
                  <Text
                    style={[
                      styles.reviewButtonText,
                      reviewAction.type === "VIEW" &&
                        styles.reviewButtonExistingText,
                    ]}
                  >
                    {!reviewActionsEnabled
                      ? "Checking review status…"
                      : reviewAction.type === "VIEW"
                        ? "View review"
                        : "Create review"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
  staffList: {
    gap: 12,
  },
  staffRow: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  staffTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  staffMeta: {
    fontSize: 14,
    color: "#666666",
  },
  reviewButton: {
    minHeight: 42,
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: "#00685f",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  reviewButtonExisting: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#00685f",
  },
  reviewButtonDisabled: {
    opacity: 0.5,
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  reviewButtonExistingText: {
    color: "#00685f",
  },
  buttonPressed: {
    opacity: 0.72,
  },
});
