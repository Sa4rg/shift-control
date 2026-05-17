import { listCurrentShiftSales, createSale, getSaleById, markSaleAsInvoiced } from "@/src/api/sales";
import { apiClient } from "@/src/api/client";

jest.mock("@/src/api/client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
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

describe("createSale", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a simple sale", async () => {
    mockedApiClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Sale created successfully",
        data: {
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
      },
    });

    const request = {
      items: [
        {
          productName: "Coffee",
          quantity: 2,
          unitPrice: 10,
        },
      ],
      discounts: [],
      payments: [
        {
          method: "CASH" as const,
          amount: 20,
        },
      ],
      invoiceStatus: "PENDING" as const,
    };

    const result = await createSale(request);

    expect(mockedApiClient.post).toHaveBeenCalledWith("/api/sales", request);
    expect(result.id).toBe("sale-1");
    expect(result.finalTotalAmount).toBe(20);
  });
});

describe("getSaleById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gets a sale by id", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Sale found",
        data: {
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
      },
    });

    const result = await getSaleById("sale-1");

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/sales/sale-1");
    expect(result.id).toBe("sale-1");
    expect(result.items).toHaveLength(1);
    expect(result.payments).toHaveLength(1);
  });
});

describe("markSaleAsInvoiced", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks a sale as invoiced", async () => {
    mockedApiClient.patch.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Sale marked as invoiced",
        data: {
          id: "sale-1",
          shiftId: "shift-1",
          staffId: "staff-1",
          storeId: "store-1",
          status: "ACTIVE",
          invoiceStatus: "INVOICED",
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
          updatedAt: "2026-05-16T08:31:00Z",
          cancelledAt: null,
          cancelledReason: null,
        },
      },
    });

    const result = await markSaleAsInvoiced("sale-1");

    expect(mockedApiClient.patch).toHaveBeenCalledWith(
      "/api/sales/sale-1/invoice"
    );
    expect(result.invoiceStatus).toBe("INVOICED");
  });
});