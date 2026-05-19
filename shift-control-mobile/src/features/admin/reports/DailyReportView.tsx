import { StyleSheet, Text, View } from "react-native";

import type { DailyReport } from "@/src/types/api";
import { formatMoney } from "@/src/utils/money";

import { getDailyTotalGlovo } from "./reportTotals";
import { SummaryRow } from "./SummaryRow";

type DailyReportViewProps = {
  report: DailyReport;
};

export function DailyReportView({ report }: DailyReportViewProps) {
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily report · {report.date}</Text>
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
          value={formatMoney(getDailyTotalGlovo(report))}
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
        <Text style={styles.cardTitle}>Staff summaries</Text>

        {report.staffSummaries.length === 0 ? (
          <Text style={styles.body}>No staff summaries for this date.</Text>
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
                  Glovo:{" "}
                  {formatMoney(staff.totalGlovoOnline + staff.totalGlovoCash)}
                </Text>
                <Text style={styles.staffMeta}>
                  Closures: {staff.closuresCount} · Incidents:{" "}
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
