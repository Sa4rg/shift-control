import { getDailyReport, getMonthlyReport, getWeeklyReport } from "@/src/api/reports";
import { apiClient } from "@/src/api/client";

jest.mock("@/src/api/client", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("getDailyReport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gets a daily report", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Daily report generated successfully",
        data: {
          storeId: "store-1",
          storeName: "Main Store",
          date: "2026-05-19",
          totalCash: 100,
          totalMb: 80,
          totalGlovoOnline: 50,
          totalGlovoCash: 20,
          totalSales: 250,
          pendingInvoiceTotal: 30,
          cashDifferenceTotal: 0,
          mbDifferenceTotal: -5,
          closuresCount: 2,
          closedOkCount: 1,
          closedWithIncidentCount: 1,
          activeSalesCount: 10,
          cancelledSalesCount: 1,
          openIncidentsCount: 1,
          resolvedIncidentsCount: 2,
          staffSummaries: [
            {
              staffId: "staff-1",
              staffName: "Sara Staff",
              totalCash: 100,
              totalMb: 80,
              totalGlovoOnline: 50,
              totalGlovoCash: 20,
              totalSales: 250,
              pendingInvoiceTotal: 30,
              cashDifferenceTotal: 0,
              mbDifferenceTotal: -5,
              closuresCount: 2,
              closedOkCount: 1,
              closedWithIncidentCount: 1,
              activeSalesCount: 10,
              cancelledSalesCount: 1,
              openIncidentsCount: 1,
              resolvedIncidentsCount: 2,
            },
          ],
        },
      },
    });

    const result = await getDailyReport({
      storeId: "store-1",
      date: "2026-05-19",
    });

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/api/admin/reports/daily",
      {
        params: {
          storeId: "store-1",
          date: "2026-05-19",
        },
      }
    );
    expect(result.storeId).toBe("store-1");
    expect(result.totalSales).toBe(250);
    expect(result.staffSummaries).toHaveLength(1);
  });
});

describe("getWeeklyReport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gets a weekly report", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Weekly report generated successfully",
        data: {
          storeId: "store-1",
          weekStart: "2026-05-18",
          weekEnd: "2026-05-24",
          staffSummaries: [
            {
              storeId: "store-1",
              storeName: "Main Store",
              staffId: "staff-1",
              staffName: "Sara Staff",
              totalCash: 100,
              totalMb: 80,
              totalGlovoOnline: 50,
              totalGlovoCash: 20,
              totalSales: 250,
              pendingInvoiceTotal: 30,
              cashDifferenceTotal: 0,
              mbDifferenceTotal: -5,
              closuresCount: 2,
              incidentCount: 3,
            },
          ],
        },
      },
    });

    const result = await getWeeklyReport({
      storeId: "store-1",
      weekStart: "2026-05-18",
    });

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/api/admin/reports/weekly",
      {
        params: {
          storeId: "store-1",
          weekStart: "2026-05-18",
        },
      }
    );
    expect(result.storeId).toBe("store-1");
    expect(result.weekStart).toBe("2026-05-18");
    expect(result.staffSummaries).toHaveLength(1);
  });
});

describe("getMonthlyReport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gets a monthly report", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Monthly report generated successfully",
        data: {
          storeId: "store-1",
          storeName: "Main Store",
          monthStart: "2026-05-01",
          monthEnd: "2026-05-31",
          totalCash: 400,
          totalMb: 300,
          totalGlovoOnline: 200,
          totalGlovoCash: 100,
          totalSales: 1000,
          pendingInvoiceTotal: 50,
          cashDifferenceTotal: 0,
          mbDifferenceTotal: -5,
          closuresCount: 10,
          closedOkCount: 8,
          closedWithIncidentCount: 2,
          activeSalesCount: 40,
          cancelledSalesCount: 3,
          openIncidentsCount: 2,
          resolvedIncidentsCount: 5,
          weeklyReviewsCount: 4,
          weeklyReviewsOkCount: 3,
          weeklyReviewsWithIncidentCount: 1,
          staffSummaries: [],
          weekSummaries: [
            {
              weekStart: "2026-05-04",
              weekEnd: "2026-05-10",
              totalSales: 250,
              closuresCount: 3,
              incidentCount: 1,
            },
          ],
        },
      },
    });

    const result = await getMonthlyReport({
      storeId: "store-1",
      month: "2026-05",
    });

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/api/admin/reports/monthly",
      {
        params: {
          storeId: "store-1",
          month: "2026-05",
        },
      }
    );
    expect(result.totalSales).toBe(1000);
    expect(result.weekSummaries).toHaveLength(1);
  });
});