import { apiClient } from "@/src/api/client";
import type { AdminUser, ApiEnvelope, UserRole } from "@/src/types/api";

export type ListUsersParams = {
  role?: UserRole;
  includeInactive?: boolean;
};

export async function listUsers(
  params: ListUsersParams = {}
): Promise<AdminUser[]> {
  const response = await apiClient.get<ApiEnvelope<AdminUser[]>>(
    "/api/admin/users",
    {
      params,
    }
  );

  return response.data.data;
}