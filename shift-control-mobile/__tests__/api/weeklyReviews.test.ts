import {
  getWeeklyReviewById,
  listWeeklyReviews,
  createWeeklyReview,
} from "@/src/api/weeklyReviews";
import { apiClient } from "@/src/api/client";

jest.mock("@/src/api/client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

const weeklyReviewMock = {
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

describe("listWeeklyReviews", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists weekly reviews", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Weekly reviews listed successfully",
        data: [weeklyReviewMock],
      },
    });

    const result = await listWeeklyReviews();

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/api/admin/weekly-reviews",
      { params: {} },
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("review-1");
  });

  it("lists weekly reviews with filters", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Weekly reviews listed successfully",
        data: [],
      },
    });

    const result = await listWeeklyReviews({
      storeId: "store-1",
      staffId: "staff-1",
      weekStart: "2026-05-18",
      status: "REVIEWED_WITH_INCIDENT",
    });

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/api/admin/weekly-reviews",
      {
        params: {
          storeId: "store-1",
          staffId: "staff-1",
          weekStart: "2026-05-18",
          status: "REVIEWED_WITH_INCIDENT",
        },
      }
    );
    expect(result).toEqual([]);
  });
});

describe("getWeeklyReviewById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gets a weekly review by id", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Weekly review found",
        data: weeklyReviewMock,
      },
    });

    const result = await getWeeklyReviewById("review-1");

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/api/admin/weekly-reviews/review-1"
    );
    expect(result.id).toBe("review-1");
    expect(result.status).toBe("REVIEWED_WITH_INCIDENT");
  });
});

describe("createWeeklyReview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a weekly review", async () => {
    const request = {
      storeId: "store-1",
      staffId: "staff-1",
      weekStart: "2026-05-18",
      status: "REVIEWED_OK" as const,
      note: "Everything reviewed.",
    };

    mockedApiClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Weekly review created successfully",
        data: {
          ...weeklyReviewMock,
          status: "REVIEWED_OK",
          note: "Everything reviewed.",
        },
      },
    });

    const result = await createWeeklyReview(request);

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/api/admin/weekly-reviews",
      request
    );
    expect(result.status).toBe("REVIEWED_OK");
    expect(result.note).toBe("Everything reviewed.");
  });
});