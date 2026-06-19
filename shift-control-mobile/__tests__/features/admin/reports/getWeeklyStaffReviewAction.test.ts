import { getWeeklyStaffReviewAction } from "@/src/features/admin/reports/getWeeklyStaffReviewAction";
import type { WeeklyAdminReview } from "@/src/types/api";

const review: WeeklyAdminReview = {
  id: "review-1",
  storeId: "store-1",
  storeName: "Main Store",
  staffId: "staff-1",
  staffName: "Sara Staff",
  reviewedById: "admin-1",
  reviewedByName: "Admin User",
  weekStart: "2026-05-18",
  weekEnd: "2026-05-24",
  totalCash: 100,
  totalMb: 80,
  totalGlovoOnline: 50,
  totalGlovoCash: 20,
  totalSales: 250,
  pendingInvoiceTotal: 30,
  cashDifferenceTotal: 0,
  mbDifferenceTotal: -5,
  closuresCount: 2,
  incidentCount: 1,
  status: "REVIEWED_WITH_INCIDENT",
  note: "Cash difference reviewed.",
  createdAt: "2026-05-25T10:00:00Z",
  updatedAt: "2026-05-25T10:00:00Z",
};

describe("getWeeklyStaffReviewAction", () => {
  it("returns create when the staff member has no existing review", () => {
    const reviewsByStaffId = new Map<string, WeeklyAdminReview>();

    const result = getWeeklyStaffReviewAction({
      staffId: "staff-1",
      reviewsByStaffId,
    });

    expect(result).toEqual({
      type: "CREATE",
    });
  });

  it("returns view with the review id when a review already exists", () => {
    const reviewsByStaffId = new Map<string, WeeklyAdminReview>([
      ["staff-1", review],
    ]);

    const result = getWeeklyStaffReviewAction({
      staffId: "staff-1",
      reviewsByStaffId,
    });

    expect(result).toEqual({
      type: "VIEW",
      reviewId: "review-1",
    });
  });

  it("does not return another staff member's review", () => {
    const reviewsByStaffId = new Map<string, WeeklyAdminReview>([
      ["staff-1", review],
    ]);

    const result = getWeeklyStaffReviewAction({
      staffId: "staff-2",
      reviewsByStaffId,
    });

    expect(result).toEqual({
      type: "CREATE",
    });
  });
});