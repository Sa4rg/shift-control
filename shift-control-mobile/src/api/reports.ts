import { apiClient } from "@/src/api/client";
import type { ApiEnvelope, DailyReport } from "@/src/types/api";

export type GetDailyReportParams = {
  storeId: string;
  date: string;
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