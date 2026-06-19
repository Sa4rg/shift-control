import { listWeeklyReviews } from "@/src/api/weeklyReviews";
import { loadWeeklyReviewsByStaffId } from "@/src/features/admin/reports/loadWeeklyReviewsByStaffId";
import type { WeeklyAdminReview } from "@/src/types/api";

jest.mock("@/src/api/weeklyReviews", () => ({
  listWeeklyReviews: jest.fn(),
}));

const mockedListWeeklyReviews =
  listWeeklyReviews as jest.MockedFunction<typeof listWeeklyReviews>;

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

describe("loadWeeklyReviewsByStaffId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads reviews for the selected store and week and indexes them by staff id", async () => {
    mockedListWeeklyReviews.mockResolvedValueOnce([review]);

    const result = await loadWeeklyReviewsByStaffId({
      storeId: "store-1",
      weekStart: "2026-05-18",
    });

    expect(mockedListWeeklyReviews).toHaveBeenCalledTimes(1);
    expect(mockedListWeeklyReviews).toHaveBeenCalledWith({
      storeId: "store-1",
      weekStart: "2026-05-18",
    });

    expect(result.get("staff-1")).toEqual(review);
  });

  it("returns an empty map when no reviews exist for the report", async () => {
    mockedListWeeklyReviews.mockResolvedValueOnce([]);

    const result = await loadWeeklyReviewsByStaffId({
      storeId: "store-1",
      weekStart: "2026-05-18",
    });

    expect(result.size).toBe(0);
  });
});