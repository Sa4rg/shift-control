import { StyleSheet, Text, View } from "react-native";

import type { MonthlyReport } from "@/src/types/api";
import { formatMoney } from "@/src/utils/money";

import { getMonthlyStaffTotalGlovo, getMonthlyTotalGlovo } from "./reportTotals";
import { SummaryRow } from "./SummaryRow";

type MonthlyReportViewProps = {
  report: MonthlyReport;
};

export function MonthlyReportView({ report }: MonthlyReportViewProps) {
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Monthly report · {report.monthStart} to {report.monthEnd}
        </Text>
        <Text style={styles.body}>{report.storeName}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sales totals</Text>

        <SummaryRow
          label="Total sales"
          value={formatMoney(report.totalSales)}
        />
        <SummaryRow label="Cash" value={formatMoney(report.totalCash)} />
        <SummaryRow label="MB" value={formatMoney(report.totalMb)} />
        <SummaryRow
          label="Glovo online"
          value={formatMoney(report.totalGlovoOnline)}
        />
        <SummaryRow
          label="Glovo cash"
          value={formatMoney(report.totalGlovoCash)}
        />
        <SummaryRow
          label="Total Glovo"
          value={formatMoney(getMonthlyTotalGlovo(report))}
        />
        <SummaryRow
          label="Pending invoice"
          value={formatMoney(report.pendingInvoiceTotal)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Closures</Text>

        <SummaryRow
          label="Closures"
          value={String(report.closuresCount)}
        />
        <SummaryRow
          label="Closed OK"
          value={String(report.closedOkCount)}
        />
        <SummaryRow
          label="Closed with incident"
          value={String(report.closedWithIncidentCount)}
        />
        <SummaryRow
          label="Cash difference total"
          value={formatMoney(report.cashDifferenceTotal)}
        />
        <SummaryRow
          label="MB difference total"
          value={formatMoney(report.mbDifferenceTotal)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sales and incidents</Text>

        <SummaryRow
          label="Active sales"
          value={String(report.activeSalesCount)}
        />
        <SummaryRow
          label="Cancelled sales"
          value={String(report.cancelledSalesCount)}
        />
        <SummaryRow
          label="Open incidents"
          value={String(report.openIncidentsCount)}
        />
        <SummaryRow
          label="Resolved incidents"
          value={String(report.resolvedIncidentsCount)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly reviews</Text>

        <SummaryRow
          label="Weekly reviews"
          value={String(report.weeklyReviewsCount)}
        />
        <SummaryRow
          label="Reviewed OK"
          value={String(report.weeklyReviewsOkCount)}
        />
        <SummaryRow
          label="Reviewed with incident"
          value={String(report.weeklyReviewsWithIncidentCount)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Week summaries</Text>

        {report.weekSummaries.length === 0 ? (
          <Text style={styles.body}>No week summaries for this month.</Text>
        ) : (
          <View style={styles.staffList}>
            {report.weekSummaries.map((week) => (
              <View key={week.weekStart} style={styles.staffRow}>
                <Text style={styles.staffTitle}>
                  Week {week.weekStart} to {week.weekEnd}
                </Text>
                <Text style={styles.staffMeta}>
                  Sales: {formatMoney(week.totalSales)}
                </Text>
                <Text style={styles.staffMeta}>
                  Closures: {week.closuresCount}
                </Text>
                <Text style={styles.staffMeta}>
                  Incidents: {week.incidentCount}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Staff summaries</Text>

        {report.staffSummaries.length === 0 ? (
          <Text style={styles.body}>No staff summaries for this month.</Text>
        ) : (
          <View style={styles.staffList}>
            {report.staffSummaries.map((staff) => (
              <View key={staff.staffId} style={styles.staffRow}>
                <Text style={styles.staffTitle}>{staff.staffName}</Text>
                <Text style={styles.staffMeta}>
                  Sales: {formatMoney(staff.totalSales)}
                </Text>
                <Text style={styles.staffMeta}>
                  Cash: {formatMoney(staff.totalCash)} · MB:{" "}
                  {formatMoney(staff.totalMb)}
                </Text>
                <Text style={styles.staffMeta}>
                  Glovo: {formatMoney(getMonthlyStaffTotalGlovo(staff))}
                </Text>
                <Text style={styles.staffMeta}>
                  Closures: {staff.closuresCount} · Closed with incident:{" "}
                  {staff.closedWithIncidentCount}
                </Text>
                <Text style={styles.staffMeta}>
                  Incidents:{" "}
                  {staff.openIncidentsCount + staff.resolvedIncidentsCount}
                </Text>
              </View>
            ))}
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
});
