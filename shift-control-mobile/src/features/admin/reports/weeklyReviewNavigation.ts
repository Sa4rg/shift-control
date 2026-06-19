type CreateWeeklyReviewRouteParams = {
  storeId: string;
  staffId: string;
  weekStart: string;
};

export function getCreateWeeklyReviewRoute({
  storeId,
  staffId,
  weekStart,
}: CreateWeeklyReviewRouteParams) {
  return {
    pathname: "/(admin)/weekly-reviews/new-review" as const,
    params: {
      storeId,
      staffId,
      weekStart,
    },
  };
}

export function getWeeklyReviewDetailRoute(reviewId: string): string {
  return `/(admin)/weekly-reviews/${reviewId}`;
}