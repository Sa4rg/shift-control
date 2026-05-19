import { apiClient } from "@/src/api/client";
import type {
  ApiEnvelope,
  WeeklyAdminReview,
  WeeklyAdminReviewStatus,
} from "@/src/types/api";

export type CreateWeeklyReviewRequest = {
  storeId: string;
  staffId: string;
  weekStart: string;
  status: WeeklyAdminReviewStatus;
  note?: string;
};

export async function listWeeklyReviews(): Promise<WeeklyAdminReview[]> {
  const response = await apiClient.get<ApiEnvelope<WeeklyAdminReview[]>>(
    "/api/admin/weekly-reviews"
  );

  return response.data.data;
}

export async function getWeeklyReviewById(
  id: string
): Promise<WeeklyAdminReview> {
  const response = await apiClient.get<ApiEnvelope<WeeklyAdminReview>>(
    `/api/admin/weekly-reviews/${id}`
  );

  return response.data.data;
}

export async function createWeeklyReview(
  request: CreateWeeklyReviewRequest
): Promise<WeeklyAdminReview> {
  const response = await apiClient.post<ApiEnvelope<WeeklyAdminReview>>(
    "/api/admin/weekly-reviews",
    request
  );

  return response.data.data;
}