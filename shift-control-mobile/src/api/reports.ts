import { apiClient } from "@/src/api/client";
import type { ApiEnvelope, DailyReport, WeeklyReport } from "@/src/types/api";

export type GetDailyReportParams = {
  storeId: string;
  date: string;
};

export type GetWeeklyReportParams = {
  storeId: string;
  weekStart: string;
};

export async function getDailyReport(
  params: GetDailyReportParams
): Promise<DailyReport> {
  const response = await apiClient.get<ApiEnvelope<DailyReport>>(
    "/api/admin/reports/daily",
    {
      params,
    }
  );

  return response.data.data;
}

export async function getWeeklyReport(
  params: GetWeeklyReportParams
): Promise<WeeklyReport> {
  const response = await apiClient.get<ApiEnvelope<WeeklyReport>>(
    "/api/admin/reports/weekly",
    {
      params,
    }
  );

  return response.data.data;
}