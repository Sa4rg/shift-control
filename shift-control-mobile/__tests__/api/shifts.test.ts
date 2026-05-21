import { AxiosError } from "axios";

import {
  closeShift,
  getCurrentShift,
  getShiftById,
  getShiftClosePreview,
  getShiftClosureByShiftId,
  listShifts,
  openShift,
} from "@/src/api/shifts";

import { apiClient } from "@/src/api/client";

jest.mock("@/src/api/client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("getCurrentShift", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns active shift when backend responds with 200", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Current shift found",
        data: {
          id: "shift-1",
          staffId: "staff-1",
          staffName: "Sara Staff",
          storeId: "store-1",
          storeName: "Main Store",
          type: "DAY",
          status: "OPEN",
          openedAt: "2026-05-16T08:00:00Z",
          closedAt: null,
          closedById: null,
        },
      },
    });

    const result = await getCurrentShift();

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/shifts/current");
    expect(result).toEqual({
      status: "active",
      shift: {
        id: "shift-1",
        staffId: "staff-1",
        staffName: "Sara Staff",
        storeId: "store-1",
        storeName: "Main Store",
        type: "DAY",
        status: "OPEN",
        openedAt: "2026-05-16T08:00:00Z",
        closedAt: null,
        closedById: null,
      },
    });
  });

  it("returns none when backend responds with 404", async () => {
    mockedApiClient.get.mockRejectedValueOnce(
      new AxiosError(
        "Open shift not found",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        {
          data: {
            success: false,
            message: "Open shift not found",
            data: null,
          },
          status: 404,
          statusText: "Not Found",
          headers: {},
          config: {} as never,
        }
      )
    );

    const result = await getCurrentShift();

    expect(result).toEqual({
      status: "none",
      shift: null,
    });
  });

  it("throws unexpected errors", async () => {
    mockedApiClient.get.mockRejectedValueOnce(
      new AxiosError(
        "Server error",
        "ERR_BAD_RESPONSE",
        undefined,
        undefined,
        {
          data: {
            success: false,
            message: "Unexpected error",
            data: null,
          },
          status: 500,
          statusText: "Internal Server Error",
          headers: {},
          config: {} as never,
        }
      )
    );

    await expect(getCurrentShift()).rejects.toThrow("Server error");
  });
});

describe("openShift", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens a shift with the selected type", async () => {
    mockedApiClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Shift opened successfully",
        data: {
          id: "shift-1",
          staffId: "staff-1",
          staffName: "Sara Staff",
          storeId: "store-1",
          storeName: "Main Store",
          type: "DAY",
          status: "OPEN",
          openedAt: "2026-05-16T08:00:00Z",
          closedAt: null,
          closedById: null,
        },
      },
    });

    const result = await openShift({ type: "DAY" });

    expect(mockedApiClient.post).toHaveBeenCalledWith("/api/shifts/open", {
      type: "DAY",
    });
    expect(result).toEqual({
      id: "shift-1",
      staffId: "staff-1",
      staffName: "Sara Staff",
      storeId: "store-1",
      storeName: "Main Store",
      type: "DAY",
      status: "OPEN",
      openedAt: "2026-05-16T08:00:00Z",
      closedAt: null,
      closedById: null,
    });
  });
});

describe("getShiftClosePreview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gets close preview for a shift", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Close preview calculated successfully",
        data: {
          shiftId: "shift-1",
          staffId: "staff-1",
          staffName: "Sara Staff",
          storeId: "store-1",
          storeName: "Main Store",
          totalCash: 150,
          totalMb: 80,
          totalGlovoOnline: 30,
          totalGlovoCash: 20,
          totalSales: 280,
          pendingInvoiceTotal: 50,
          cashToWithdraw: 170,
          expectedPhysicalCash: 273,
        },
      },
    });

    const result = await getShiftClosePreview("shift-1");

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/api/shifts/shift-1/close-preview"
    );
    expect(result.shiftId).toBe("shift-1");
    expect(result.totalSales).toBe(280);
    expect(result.expectedPhysicalCash).toBe(273);
  });
});

describe("closeShift", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("closes a shift with confirmed totals", async () => {
    mockedApiClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Shift closed successfully",
        data: {
          shiftId: "shift-1",
          staffId: "staff-1",
          staffName: "Sara Staff",
          storeId: "store-1",
          storeName: "Main Store",
          totalCash: 150,
          totalMb: 80,
          totalGlovoOnline: 30,
          totalGlovoCash: 20,
          totalSales: 280,
          pendingInvoiceTotal: 50,
          cashToWithdraw: 170,
          expectedPhysicalCash: 273,
          confirmedCashAmount: 273,
          confirmedMbAmount: 80,
          cashDifference: 0,
          mbDifference: 0,
          closedById: "staff-1",
          status: "CLOSED_OK",
        },
      },
    });

    const request = {
      confirmedCashAmount: 273,
      confirmedMbAmount: 80,
      note: "Everything matched",
    };

    const result = await closeShift("shift-1", request);

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/api/shifts/shift-1/close",
      request
    );
    expect(result.status).toBe("CLOSED_OK");
    expect(result.cashDifference).toBe(0);
    expect(result.mbDifference).toBe(0);
  });
});

describe("listShifts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists shifts for the authenticated user", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Shifts listed successfully",
        data: [
          {
            id: "shift-1",
            staffId: "staff-1",
            staffName: "Sara Staff",
            storeId: "store-1",
            storeName: "Main Store",
            type: "DAY",
            status: "CLOSED",
            openedAt: "2026-05-16T08:00:00Z",
            closedAt: "2026-05-16T16:00:00Z",
            closedById: "staff-1",
          },
        ],
      },
    });

    const result = await listShifts();

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/shifts", { params: {} });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("shift-1");
    expect(result[0].status).toBe("CLOSED");
  });

  it("lists shifts with filters", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Shifts listed successfully",
        data: [],
      },
    });

    const result = await listShifts({
      storeId: "store-1",
      staffId: "staff-1",
      status: "CLOSED",
      from: "2026-05-01",
      to: "2026-05-31",
    });

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/shifts", {
      params: {
        storeId: "store-1",
        staffId: "staff-1",
        status: "CLOSED",
        from: "2026-05-01",
        to: "2026-05-31",
      },
    });
    expect(result).toEqual([]);
  });
});

describe("getShiftById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gets a shift by id", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Shift found",
        data: {
          id: "shift-1",
          staffId: "staff-1",
          staffName: "Sara Staff",
          storeId: "store-1",
          storeName: "Main Store",
          type: "DAY",
          status: "CLOSED",
          openedAt: "2026-05-16T08:00:00Z",
          closedAt: "2026-05-16T16:00:00Z",
          closedById: "staff-1",
        },
      },
    });

    const result = await getShiftById("shift-1");

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/shifts/shift-1");
    expect(result.id).toBe("shift-1");
    expect(result.status).toBe("CLOSED");
  });
});

describe("getShiftClosureByShiftId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gets a shift closure by shift id", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Closure found",
        data: {
          id: "closure-1",
          shiftId: "shift-1",
          closedById: "staff-1",
          totalCash: 30,
          totalMb: 20,
          totalGlovoOnline: 10,
          totalGlovoCash: 5,
          totalSales: 65,
          pendingInvoiceTotal: 0,
          cashToWithdraw: 35,
          expectedPhysicalCash: 138,
          confirmedCashAmount: 138,
          confirmedMbAmount: 20,
          cashDifference: 0,
          mbDifference: 0,
          status: "CLOSED_OK",
          note: null,
          createdAt: "2026-05-16T16:00:00Z",
          updatedAt: "2026-05-16T16:00:00Z",
        },
      },
    });

    const result = await getShiftClosureByShiftId("shift-1");

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/closures", {
      params: {
        shiftId: "shift-1",
      },
    });
    expect(result.id).toBe("closure-1");
    expect(result.status).toBe("CLOSED_OK");
  });
});