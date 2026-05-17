import { apiClient } from "@/src/api/client";
import type { ApiEnvelope, Sale } from "@/src/types/api";

export async function listCurrentShiftSales(): Promise<Sale[]> {
  const response = await apiClient.get<ApiEnvelope<Sale[]>>(
    "/api/sales?shiftId=current"
  );

  return response.data.data;
}