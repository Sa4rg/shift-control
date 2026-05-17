import { apiClient } from "@/src/api/client";
import type { ApiEnvelope, CreateSaleRequest, Sale } from "@/src/types/api";

export async function listCurrentShiftSales(): Promise<Sale[]> {
  const response = await apiClient.get<ApiEnvelope<Sale[]>>(
    "/api/sales?shiftId=current"
  );

  return response.data.data;
}

export async function createSale(request: CreateSaleRequest): Promise<Sale> {
  const response = await apiClient.post<ApiEnvelope<Sale>>("/api/sales", request);

  return response.data.data;
}