import { apiClient } from "@/src/api/client";
import type { ApiEnvelope, AuthUser, LoginResponse } from "@/src/types/api";

export type StaffLoginRequest = {
  username: string;
  pin: string;
};

export type AdminLoginRequest = {
  username: string;
  password: string;
};

export async function staffLogin(
  request: StaffLoginRequest
): Promise<LoginResponse> {
  const response = await apiClient.post<ApiEnvelope<LoginResponse>>(
    "/api/auth/staff/login",
    request
  );

  return response.data.data;
}

export async function adminLogin(
  request: AdminLoginRequest
): Promise<LoginResponse> {
  const response = await apiClient.post<ApiEnvelope<LoginResponse>>(
    "/api/auth/admin/login",
    request
  );

  return response.data.data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await apiClient.get<ApiEnvelope<AuthUser>>("/api/auth/me");

  return response.data.data;
}