import type {
  DailyReport,
  MonthlyReport,
  MonthlyStaffSummary,
  WeeklyReport,
  WeeklyStaffSummary,
} from "@/src/types/api";

export type WeeklyTotals = {
  totalCash: number;
  totalMb: number;
  totalGlovoOnline: number;
  totalGlovoCash: number;
  totalSales: number;
  pendingInvoiceTotal: number;
  cashDifferenceTotal: number;
  mbDifferenceTotal: number;
  closuresCount: number;
  incidentCount: number;
};

export function getDailyTotalGlovo(report: DailyReport): number {
  return report.totalGlovoOnline + report.totalGlovoCash;
}

export function getWeeklyStaffTotalGlovo(staff: WeeklyStaffSummary): number {
  return staff.totalGlovoOnline + staff.totalGlovoCash;
}

export function getMonthlyTotalGlovo(report: MonthlyReport): number {
  return report.totalGlovoOnline + report.totalGlovoCash;
}

export function getMonthlyStaffTotalGlovo(staff: MonthlyStaffSummary): number {
  return staff.totalGlovoOnline + staff.totalGlovoCash;
}

export function getWeeklyTotals(report: WeeklyReport): WeeklyTotals {
  return report.staffSummaries.reduce<WeeklyTotals>(
    (totals, staff) => ({
      totalCash: totals.totalCash + staff.totalCash,
      totalMb: totals.totalMb + staff.totalMb,
      totalGlovoOnline: totals.totalGlovoOnline + staff.totalGlovoOnline,
      totalGlovoCash: totals.totalGlovoCash + staff.totalGlovoCash,
      totalSales: totals.totalSales + staff.totalSales,
      pendingInvoiceTotal:
        totals.pendingInvoiceTotal + staff.pendingInvoiceTotal,
      cashDifferenceTotal:
        totals.cashDifferenceTotal + staff.cashDifferenceTotal,
      mbDifferenceTotal: totals.mbDifferenceTotal + staff.mbDifferenceTotal,
      closuresCount: totals.closuresCount + staff.closuresCount,
      incidentCount: totals.incidentCount + staff.incidentCount,
    }),
    {
      totalCash: 0,
      totalMb: 0,
      totalGlovoOnline: 0,
      totalGlovoCash: 0,
      totalSales: 0,
      pendingInvoiceTotal: 0,
      cashDifferenceTotal: 0,
      mbDifferenceTotal: 0,
      closuresCount: 0,
      incidentCount: 0,
    }
  );
}
