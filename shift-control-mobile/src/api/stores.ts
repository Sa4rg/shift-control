import { apiClient } from "@/src/api/client";
import type { ApiEnvelope, Store } from "@/src/types/api";

export type ListStoresParams = {
  search?: string;
  includeInactive?: boolean;
};

export type CreateStoreRequest = {
  name: string;
  address: string;
  baseCashAmount: number;
};

export async function listStores(
  params: ListStoresParams = {}
): Promise<Store[]> {
  const response = await apiClient.get<ApiEnvelope<Store[]>>("/api/stores", {
    params,
  });

  return response.data.data;
}

export async function getStoreById(id: string): Promise<Store> {
  const response = await apiClient.get<ApiEnvelope<Store>>(`/api/stores/${id}`);

  return response.data.data;
}

export async function createStore(request: CreateStoreRequest): Promise<Store> {
  const response = await apiClient.post<ApiEnvelope<Store>>(
    "/api/stores",
    request
  );

  return response.data.data;
}

export async function deactivateStore(id: string): Promise<Store> {
  const response = await apiClient.patch<ApiEnvelope<Store>>(
    `/api/stores/${id}/deactivate`
  );

  return response.data.data;
}