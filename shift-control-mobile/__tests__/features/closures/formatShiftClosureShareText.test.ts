import { formatShiftClosureShareText } from "@/src/features/closures/formatShiftClosureShareText";
import type { Shift, ShiftClosure } from "@/src/types/api";

jest.mock("@/src/utils/dates", () => ({
  formatDateTime: jest.fn((value: string) => {
    const values: Record<string, string> = {
      "2026-06-15T08:00:00Z": "15/06/2026, 08:00",
      "2026-06-15T17:00:00Z": "15/06/2026, 17:00",
    };

    return values[value] ?? value;
  }),
}));

describe("formatShiftClosureShareText", () => {
  it("formats a complete shift closure summary", () => {
    const shift: Shift = {
      id: "shift-1",
      staffId: "staff-1",
      staffName: "Sara Arguello",
      storeId: "store-1",
      storeName: "Kings Yard Baixa",
      type: "DAY",
      status: "CLOSED",
      openedAt: "2026-06-15T08:00:00Z",
      closedAt: "2026-06-15T17:00:00Z",
      closedById: "staff-1",
    };

    const closure: ShiftClosure = {
      id: "closure-1",
      shiftId: "shift-1",
      closedById: "staff-1",
      totalCash: 30,
      totalMb: 20,
      totalGlovoOnline: 10,
      totalGlovoCash: 5,
      totalSales: 65,
      pendingInvoiceTotal: 15,
      cashToWithdraw: 35,
      expectedPhysicalCash: 138,
      confirmedCashAmount: 135,
      confirmedMbAmount: 22,
      cashDifference: -3,
      mbDifference: 2,
      status: "CLOSED_WITH_INCIDENT",
      note: "Cash difference reviewed",
      createdAt: "2026-06-15T17:00:00Z",
      updatedAt: "2026-06-15T17:00:00Z",
    };

    const result = formatShiftClosureShareText({
      shift,
      closure,
    });

    expect(result).toBe(
      [
        "SHIFT CLOSURE",
        "",
        "Store: Kings Yard Baixa",
        "Staff: Sara Arguello",
        "Shift: Day",
        "Opened: 15/06/2026, 08:00",
        "Closed: 15/06/2026, 17:00",
        "",
        "Total sales: €65.00",
        "Cash: €30.00",
        "MB: €20.00",
        "Glovo online: €10.00",
        "Glovo cash: €5.00",
        "Pending invoice: €15.00",
        "",
        "Expected physical cash: €138.00",
        "Confirmed cash: €135.00",
        "Cash difference: -€3.00",
        "",
        "Expected MB: €20.00",
        "Confirmed MB: €22.00",
        "MB difference: +€2.00",
        "",
        "Cash to withdraw: €35.00",
        "Base cash remaining: €103.00",
        "",
        "Status: Closed with incident",
        "Note: Cash difference reviewed",
      ].join("\n")
    );
  });

  it("omits optional lines and uses the closure date when shift closedAt is missing", () => {
    const shift: Shift = {
      id: "shift-2",
      staffId: "staff-2",
      staffName: "John Doe",
      storeId: "store-2",
      storeName: "Main Store",
      type: "NIGHT",
      status: "CLOSED",
      openedAt: "2026-06-15T08:00:00Z",
      closedAt: null,
      closedById: "staff-2",
    };

    const closure: ShiftClosure = {
      id: "closure-2",
      shiftId: "shift-2",
      closedById: "staff-2",
      totalCash: 40,
      totalMb: 25,
      totalGlovoOnline: 0,
      totalGlovoCash: 0,
      totalSales: 65,
      pendingInvoiceTotal: 0,
      cashToWithdraw: 40,
      expectedPhysicalCash: 143,
      confirmedCashAmount: 143,
      confirmedMbAmount: 25,
      cashDifference: 0,
      mbDifference: 0,
      status: "CLOSED_OK",
      note: null,
      createdAt: "2026-06-15T17:00:00Z",
      updatedAt: "2026-06-15T17:00:00Z",
    };

    const result = formatShiftClosureShareText({
      shift,
      closure,
    });

    expect(result).toBe(
      [
        "SHIFT CLOSURE",
        "",
        "Store: Main Store",
        "Staff: John Doe",
        "Shift: Night",
        "Opened: 15/06/2026, 08:00",
        "Closed: 15/06/2026, 17:00",
        "",
        "Total sales: €65.00",
        "Cash: €40.00",
        "MB: €25.00",
        "Glovo online: €0.00",
        "Glovo cash: €0.00",
        "",
        "Expected physical cash: €143.00",
        "Confirmed cash: €143.00",
        "Cash difference: €0.00",
        "",
        "Expected MB: €25.00",
        "Confirmed MB: €25.00",
        "MB difference: €0.00",
        "",
        "Cash to withdraw: €40.00",
        "Base cash remaining: €103.00",
        "",
        "Status: Closed successfully",
      ].join("\n")
    );

    expect(result).not.toContain("Pending invoice:");
    expect(result).not.toContain("Note:");
  });
});