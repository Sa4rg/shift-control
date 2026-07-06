import { render, screen, waitFor } from "@testing-library/react-native";

import AdminShiftDetailScreen from "@/app/(admin)/shifts/[id]";
import { getShiftById, getShiftClosureByShiftId } from "@/src/api/shifts";
import { listSalesByShiftId } from "@/src/api/sales";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: () => ({
    id: "shift-1",
  }),
}));

jest.mock("@/src/components/AppTopBar", () => ({
  AppTopBar: () => null,
}));

jest.mock("@/src/api/shifts", () => ({
  getShiftById: jest.fn(),
  getShiftClosureByShiftId: jest.fn(),
}));

jest.mock("@/src/api/sales", () => ({
  listSalesByShiftId: jest.fn(),
}));

const mockedGetShiftById = getShiftById as jest.MockedFunction<
  typeof getShiftById
>;
const mockedGetShiftClosureByShiftId =
  getShiftClosureByShiftId as jest.MockedFunction<typeof getShiftClosureByShiftId>;
const mockedListSalesByShiftId = listSalesByShiftId as jest.MockedFunction<
  typeof listSalesByShiftId
>;

describe("AdminShiftDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedListSalesByShiftId.mockResolvedValue([]);
  });

  it("renders WITH INCIDENT with differences and incident summary", async () => {
    mockedGetShiftById.mockResolvedValue({
      id: "shift-1",
      staffId: "staff-1",
      staffName: "Sara Alexandra",
      storeId: "store-1",
      storeName: "Baixa Kings Yard",
      type: "DAY",
      status: "CLOSED",
      openedAt: "2026-07-06T16:35:00Z",
      closedAt: "2026-07-06T17:35:00Z",
      closedById: "staff-1",
      closureStatus: "CLOSED_WITH_INCIDENT",
      cashDifference: -32,
      mbDifference: 7,
      openIncidentCount: 2,
      totalIncidentCount: 2,
    });

    mockedGetShiftClosureByShiftId.mockResolvedValue({
      id: "closure-1",
      shiftId: "shift-1",
      closedById: "staff-1",
      totalCash: 30,
      totalMb: 20,
      totalGlovoOnline: 0,
      totalGlovoCash: 0,
      totalSales: 50,
      pendingInvoiceTotal: 0,
      cashToWithdraw: 0,
      expectedPhysicalCash: 103,
      confirmedCashAmount: 71,
      confirmedMbAmount: 27,
      cashDifference: -32,
      mbDifference: 7,
      status: "CLOSED_WITH_INCIDENT",
      note: null,
      createdAt: "2026-07-06T17:35:00Z",
      updatedAt: "2026-07-06T17:35:00Z",
    });

    render(<AdminShiftDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("WITH INCIDENT")).toBeTruthy();
    });

    expect(screen.getByText("Cash difference: -€32.00")).toBeTruthy();
    expect(screen.getByText("MB difference: +€7.00")).toBeTruthy();
    expect(screen.getByText("2 open incidents")).toBeTruthy();
  });

  it("renders CLOSED OK without incident summary", async () => {
    mockedGetShiftById.mockResolvedValue({
      id: "shift-2",
      staffId: "staff-1",
      staffName: "Sara Alexandra",
      storeId: "store-1",
      storeName: "Baixa Kings Yard",
      type: "DAY",
      status: "CLOSED",
      openedAt: "2026-07-06T16:34:00Z",
      closedAt: "2026-07-06T17:35:00Z",
      closedById: "staff-1",
      closureStatus: "CLOSED_OK",
      cashDifference: 0,
      mbDifference: 0,
      openIncidentCount: 0,
      totalIncidentCount: 0,
    });

    mockedGetShiftClosureByShiftId.mockResolvedValue({
      id: "closure-2",
      shiftId: "shift-2",
      closedById: "staff-1",
      totalCash: 30,
      totalMb: 20,
      totalGlovoOnline: 0,
      totalGlovoCash: 0,
      totalSales: 50,
      pendingInvoiceTotal: 0,
      cashToWithdraw: 0,
      expectedPhysicalCash: 103,
      confirmedCashAmount: 103,
      confirmedMbAmount: 20,
      cashDifference: 0,
      mbDifference: 0,
      status: "CLOSED_OK",
      note: null,
      createdAt: "2026-07-06T17:35:00Z",
      updatedAt: "2026-07-06T17:35:00Z",
    });

    render(<AdminShiftDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("CLOSED OK")).toBeTruthy();
    });

    expect(screen.queryByText(/open incidents/)).toBeNull();
    expect(screen.queryByText("Cash difference: +€0.00")).toBeNull();
    expect(screen.queryByText("MB difference: +€0.00")).toBeNull();
  });
});