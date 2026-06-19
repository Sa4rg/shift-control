import type { WeeklyAdminReview } from "@/src/types/api";

type GetWeeklyStaffReviewActionParams = {
  staffId: string;
  reviewsByStaffId: Map<string, WeeklyAdminReview>;
};

export type WeeklyStaffReviewAction =
  | {
      type: "CREATE";
    }
  | {
      type: "VIEW";
      reviewId: string;
    };

export function getWeeklyStaffReviewAction({
  staffId,
  reviewsByStaffId,
}: GetWeeklyStaffReviewActionParams): WeeklyStaffReviewAction {
  const review = reviewsByStaffId.get(staffId);

  if (!review) {
    return {
      type: "CREATE",
    };
  }

  return {
    type: "VIEW",
    reviewId: review.id,
  };
}