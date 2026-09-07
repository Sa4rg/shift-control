import { apiClient } from "@/src/api/client";
import type { AdminUser, ApiEnvelope, MonthlyWorkHours, UserRole } from "@/src/types/api";

export type ListUsersParams = {
  role?: UserRole;
  includeInactive?: boolean;
};

export type CreateStaffRequest = {
  fullName: string;
  username: string;
  pin: string;
  storeId: string;
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

export async function createStaff(
  request: CreateStaffRequest
): Promise<AdminUser> {
  const response = await apiClient.post<ApiEnvelope<AdminUser>>(
    "/api/admin/users/staff",
    request
  );

  return response.data.data;
}

export async function getUserById(id: string): Promise<AdminUser> {
  const response = await apiClient.get<ApiEnvelope<AdminUser>>(
    `/api/admin/users/${id}`
  );

  return response.data.data;
}

export async function deactivateUser(id: string): Promise<AdminUser> {
  const response = await apiClient.patch<ApiEnvelope<AdminUser>>(
    `/api/admin/users/${id}/deactivate`
  );

  return response.data.data;
}

export async function getUserMonthlyWorkHours(
  userId: string,
  year: number,
  month: number
): Promise<MonthlyWorkHours> {
  const response = await apiClient.get<ApiEnvelope<MonthlyWorkHours>>(
    `/api/admin/users/${userId}/work-hours/monthly`,
    {
      params: { year, month },
    }
  );

  return response.data.data;
}
