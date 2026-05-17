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

export async function getSaleById(id: string): Promise<Sale> {
  const response = await apiClient.get<ApiEnvelope<Sale>>(`/api/sales/${id}`);

  return response.data.data;
}

export async function markSaleAsInvoiced(id: string): Promise<Sale> {
  const response = await apiClient.patch<ApiEnvelope<Sale>>(
    `/api/sales/${id}/invoice`
  );

  return response.data.data;
}