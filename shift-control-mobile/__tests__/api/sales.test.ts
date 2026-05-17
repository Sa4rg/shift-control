import { listCurrentShiftSales } from "@/src/api/sales";
import { apiClient } from "@/src/api/client";

jest.mock("@/src/api/client", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("listCurrentShiftSales", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists current shift sales", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Sales listed successfully",
        data: [
          {
            id: "sale-1",
            shiftId: "shift-1",
            staffId: "staff-1",
            storeId: "store-1",
            status: "ACTIVE",
            invoiceStatus: "PENDING",
            subtotalAmount: 20,
            discountTotalAmount: 0,
            finalTotalAmount: 20,
            note: null,
            items: [
              {
                id: "item-1",
                productName: "Coffee",
                quantity: 2,
                unitPrice: 10,
                lineTotal: 20,
              },
            ],
            discounts: [],
            payments: [
              {
                id: "payment-1",
                method: "CASH",
                amount: 20,
              },
            ],
            createdAt: "2026-05-16T08:30:00Z",
            updatedAt: "2026-05-16T08:30:00Z",
            cancelledAt: null,
            cancelledReason: null,
          },
        ],
      },
    });

    const result = await listCurrentShiftSales();

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/api/sales?shiftId=current"
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("sale-1");
    expect(result[0].finalTotalAmount).toBe(20);
  });
});