import type { WeeklyAdminReview } from "@/src/types/api";

export function indexWeeklyReviewsByStaffId(
  reviews: WeeklyAdminReview[]
): Map<string, WeeklyAdminReview> {
  return new Map(
    reviews.map((review) => [review.staffId, review])
  );
}