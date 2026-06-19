import { listWeeklyReviews } from "@/src/api/weeklyReviews";
import { indexWeeklyReviewsByStaffId } from "@/src/features/admin/reports/indexWeeklyReviewsByStaffId";
import type { WeeklyAdminReview } from "@/src/types/api";

type LoadWeeklyReviewsByStaffIdParams = {
  storeId: string;
  weekStart: string;
};

export async function loadWeeklyReviewsByStaffId({
  storeId,
  weekStart,
}: LoadWeeklyReviewsByStaffIdParams): Promise<
  Map<string, WeeklyAdminReview>
> {
  const reviews = await listWeeklyReviews({
    storeId,
    weekStart,
  });

  return indexWeeklyReviewsByStaffId(reviews);
}