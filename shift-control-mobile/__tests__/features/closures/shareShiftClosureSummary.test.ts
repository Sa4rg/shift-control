import { Share } from "react-native";

import { shareShiftClosureSummary } from "@/src/features/closures/shareShiftClosureSummary";
import type { Shift, ShiftClosure } from "@/src/types/api";

jest.mock("react-native", () => ({
  Share: {
    share: jest.fn(),
  },
}));

jest.mock(
  "@/src/features/closures/formatShiftClosureShareText",
  () => ({
    formatShiftClosureShareText: jest.fn(() => "FORMATTED CLOSURE SUMMARY"),
  })
);

const mockedShare = Share.share as jest.MockedFunction<typeof Share.share>;

describe("shareShiftClosureSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens the native share sheet with the formatted closure summary", async () => {
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
      pendingInvoiceTotal: 0,
      cashToWithdraw: 35,
      expectedPhysicalCash: 138,
      confirmedCashAmount: 138,
      confirmedMbAmount: 20,
      cashDifference: 0,
      mbDifference: 0,
      status: "CLOSED_OK",
      note: null,
      createdAt: "2026-06-15T17:00:00Z",
      updatedAt: "2026-06-15T17:00:00Z",
    };

    mockedShare.mockResolvedValueOnce({
      action: Share.sharedAction,
      activityType: "com.whatsapp",
    });

    await shareShiftClosureSummary({
      shift,
      closure,
    });

    expect(mockedShare).toHaveBeenCalledTimes(1);
    expect(mockedShare).toHaveBeenCalledWith({
      message: "FORMATTED CLOSURE SUMMARY",
      title: "Shift closure",
    });
  });
});