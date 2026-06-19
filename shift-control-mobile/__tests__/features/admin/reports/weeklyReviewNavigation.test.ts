import {
  getCreateWeeklyReviewRoute,
  getWeeklyReviewDetailRoute,
} from "@/src/features/admin/reports/weeklyReviewNavigation";

describe("weekly review navigation", () => {
  it("builds the create review route with report context", () => {
    const result = getCreateWeeklyReviewRoute({
      storeId: "store-1",
      staffId: "staff-1",
      weekStart: "2026-05-18",
    });

    expect(result).toEqual({
      pathname: "/(admin)/weekly-reviews/new-review",
      params: {
        storeId: "store-1",
        staffId: "staff-1",
        weekStart: "2026-05-18",
      },
    });
  });

  it("builds the existing review detail route", () => {
    const result = getWeeklyReviewDetailRoute("review-1");

    expect(result).toBe("/(admin)/weekly-reviews/review-1");
  });
});