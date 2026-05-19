import { apiClient } from "@/src/api/client";
import type { ApiEnvelope, Store } from "@/src/types/api";

export type ListStoresParams = {
  search?: string;
  includeInactive?: boolean;
};

export async function listStores(
  params: ListStoresParams = {}
): Promise<Store[]> {
  const response = await apiClient.get<ApiEnvelope<Store[]>>("/api/stores", {
    params,
  });

  return response.data.data;
}