import {
  cancelSale,
  createSale,
  getSaleById,
  listCurrentShiftSales,
  listSalesByShiftId,
  markSaleAsInvoiced,
} from "@/src/api/sales";

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

  it("creates a simple sale with Glovo online payment", async () => {
    mockedApiClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Sale created successfully",
        data: {
          id: "sale-2",
          shiftId: "shift-1",
          staffId: "staff-1",
          storeId: "store-1",
          status: "ACTIVE",
          invoiceStatus: "PENDING",
          subtotalAmount: 15,
          discountTotalAmount: 0,
          finalTotalAmount: 15,
          note: null,
          items: [
            {
              id: "item-2",
              productName: "Glovo order",
              quantity: 1,
              unitPrice: 15,
              lineTotal: 15,
            },
          ],
          discounts: [],
          payments: [
            {
              id: "payment-2",
              method: "GLOVO_ONLINE",
              amount: 15,
            },
          ],
          createdAt: "2026-05-16T09:00:00Z",
          updatedAt: "2026-05-16T09:00:00Z",
          cancelledAt: null,
          cancelledReason: null,
        },
      },
    });

    const request = {
      items: [
        {
          productName: "Glovo order",
          quantity: 1,
          unitPrice: 15,
        },
      ],
      discounts: [],
      payments: [
        {
          method: "GLOVO_ONLINE" as const,
          amount: 15,
        },
      ],
      invoiceStatus: "PENDING" as const,
    };

    const result = await createSale(request);

    expect(mockedApiClient.post).toHaveBeenCalledWith("/api/sales", request);
    expect(result.id).toBe("sale-2");
    expect(result.payments[0].method).toBe("GLOVO_ONLINE");
  });

  it("creates a sale with a manual discount", async () => {
    const request = {
      items: [
        {
          productName: "Coffee",
          quantity: 3,
          unitPrice: 10,
        },
      ],
      discounts: [
        {
          reason: "MANUAL_DISCOUNT" as const,
          amount: 5,
          note: "Manager approved",
        },
      ],
      payments: [
        {
          method: "CASH" as const,
          amount: 25,
        },
      ],
      invoiceStatus: "PENDING" as const,
    };

    mockedApiClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Sale created successfully",
        data: {
          id: "sale-3",
          shiftId: "shift-1",
          staffId: "staff-1",
          storeId: "store-1",
          status: "ACTIVE",
          invoiceStatus: "PENDING",
          subtotalAmount: 30,
          discountTotalAmount: 5,
          finalTotalAmount: 25,
          note: null,
          items: [
            {
              id: "item-3",
              productName: "Coffee",
              quantity: 3,
              unitPrice: 10,
              lineTotal: 30,
            },
          ],
          discounts: [
            {
              id: "discount-1",
              type: "FIXED_AMOUNT",
              reason: "MANUAL_DISCOUNT",
              value: 5,
              amountApplied: 5,
              note: "Manager approved",
            },
          ],
          payments: [
            {
              id: "payment-3",
              method: "CASH",
              amount: 25,
            },
          ],
          createdAt: "2026-05-16T09:00:00Z",
          updatedAt: "2026-05-16T09:00:00Z",
          cancelledAt: null,
          cancelledReason: null,
        },
      },
    });

    const result = await createSale(request);

    expect(mockedApiClient.post).toHaveBeenCalledWith("/api/sales", request);
    expect(result.discountTotalAmount).toBe(5);
    expect(result.finalTotalAmount).toBe(25);
    expect(result.discounts[0].reason).toBe("MANUAL_DISCOUNT");
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

describe("cancelSale", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("cancels a sale with a reason", async () => {
    mockedApiClient.patch.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Sale cancelled successfully",
        data: {
          id: "sale-1",
          shiftId: "shift-1",
          staffId: "staff-1",
          storeId: "store-1",
          status: "CANCELLED",
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
          updatedAt: "2026-05-16T08:31:00Z",
          cancelledAt: "2026-05-16T08:31:00Z",
          cancelledReason: "Customer changed their mind",
        },
      },
    });

    const result = await cancelSale("sale-1", {
      reason: "Customer changed their mind",
    });

    expect(mockedApiClient.patch).toHaveBeenCalledWith(
      "/api/sales/sale-1/cancel",
      {
        reason: "Customer changed their mind",
      }
    );
    expect(result.status).toBe("CANCELLED");
    expect(result.cancelledReason).toBe("Customer changed their mind");
  });
});

describe("listSalesByShiftId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists sales by shift id", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Sales listed successfully",
        data: [],
      },
    });

    const result = await listSalesByShiftId("shift-1");

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/sales", {
      params: {
        shiftId: "shift-1",
      },
    });
    expect(result).toEqual([]);
  });
});