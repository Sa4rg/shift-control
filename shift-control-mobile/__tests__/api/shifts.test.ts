import { AxiosError } from "axios";

import { getCurrentShift } from "@/src/api/shifts";
import { apiClient } from "@/src/api/client";

jest.mock("@/src/api/client", () => ({
  apiClient: {
    get: jest.fn(),
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
          storeId: "store-1",
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
        storeId: "store-1",
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