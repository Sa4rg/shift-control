import { indexWeeklyReviewsByStaffId } from "@/src/features/admin/reports/indexWeeklyReviewsByStaffId";
import type { WeeklyAdminReview } from "@/src/types/api";

const createReview = (
  overrides: Partial<WeeklyAdminReview> = {}
): WeeklyAdminReview => ({
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
  ...overrides,
});

describe("indexWeeklyReviewsByStaffId", () => {
  it("indexes existing weekly reviews by staff id", () => {
    const saraReview = createReview({
      id: "review-sara",
      staffId: "staff-sara",
      staffName: "Sara Staff",
    });

    const alexReview = createReview({
      id: "review-alex",
      staffId: "staff-alex",
      staffName: "Alex Staff",
      status: "REVIEWED_OK",
    });

    const result = indexWeeklyReviewsByStaffId([
      saraReview,
      alexReview,
    ]);

    expect(result.get("staff-sara")).toEqual(saraReview);
    expect(result.get("staff-alex")).toEqual(alexReview);
    expect(result.get("staff-missing")).toBeUndefined();
  });

  it("returns an empty map when there are no reviews", () => {
    const result = indexWeeklyReviewsByStaffId([]);

    expect(result.size).toBe(0);
  });
});