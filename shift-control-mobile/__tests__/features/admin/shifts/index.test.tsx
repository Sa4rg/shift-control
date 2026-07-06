import { render, screen, waitFor } from "@testing-library/react-native";

import AdminShiftsScreen from "@/app/(admin)/shifts";
import { listShifts } from "@/src/api/shifts";
import { listStores } from "@/src/api/stores";
import { listUsers } from "@/src/api/users";

jest.mock("expo-router", () => {
  const React = require("react");

  return {
    router: {
      push: jest.fn(),
      back: jest.fn(),
    },
    useFocusEffect: (callback: () => void) => {
      React.useEffect(() => {
        callback();
      }, []);
    },
  };
});

jest.mock("@/src/components/AppTopBar", () => ({
  AppTopBar: () => null,
}));

jest.mock("@/src/api/shifts", () => ({
  listShifts: jest.fn(),
}));

jest.mock("@/src/api/stores", () => ({
  listStores: jest.fn(),
}));

jest.mock("@/src/api/users", () => ({
  listUsers: jest.fn(),
}));

const mockedListShifts = listShifts as jest.MockedFunction<typeof listShifts>;
const mockedListStores = listStores as jest.MockedFunction<typeof listStores>;
const mockedListUsers = listUsers as jest.MockedFunction<typeof listUsers>;

describe("AdminShiftsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedListStores.mockResolvedValue([
    {
        id: "store-1",
        name: "Kings Yard Baixa",
        address: "Rua Test",
        baseCashAmount: 103,
        wifiSsid: "MEO-TEST",
        active: true,
        deactivatedById: null,
        deactivatedByName: null,
        deactivatedAt: null,
    },
    ]);

    mockedListUsers.mockResolvedValue([
    {
        id: "staff-1",
        username: "sara.staff",
        fullName: "Sara Staff",
        email: null,
        role: "STAFF",
        storeId: "store-1",
        active: true,
        deactivatedById: null,
        deactivatedByName: null,
        deactivatedAt: null,
    },
    ]);
  });

  it("renders WITH INCIDENT with differences and incident summary", async () => {
    mockedListShifts.mockResolvedValue([
      {
        id: "shift-1",
        staffId: "staff-1",
        staffName: "Sara Staff",
        storeId: "store-1",
        storeName: "Kings Yard Baixa",
        type: "DAY",
        status: "CLOSED",
        openedAt: "2026-07-06T08:00:00Z",
        closedAt: "2026-07-06T17:00:00Z",
        closedById: "staff-1",
        closureStatus: "CLOSED_WITH_INCIDENT",
        cashDifference: 4,
        mbDifference: -3.5,
        openIncidentCount: 2,
        totalIncidentCount: 2,
      },
    ]);

    render(<AdminShiftsScreen />);

    await waitFor(() => {
      expect(screen.getByText("WITH INCIDENT")).toBeTruthy();
    });

    expect(screen.getByText("Cash difference: +€4.00")).toBeTruthy();
    expect(screen.getByText("MB difference: -€3.50")).toBeTruthy();
    expect(screen.getByText("2 open incidents")).toBeTruthy();
  });

  it("renders CLOSED OK without difference rows", async () => {
    mockedListShifts.mockResolvedValue([
      {
        id: "shift-2",
        staffId: "staff-1",
        staffName: "Sara Staff",
        storeId: "store-1",
        storeName: "Kings Yard Baixa",
        type: "DAY",
        status: "CLOSED",
        openedAt: "2026-07-06T08:00:00Z",
        closedAt: "2026-07-06T17:00:00Z",
        closedById: "staff-1",
        closureStatus: "CLOSED_OK",
        cashDifference: 0,
        mbDifference: 0,
        openIncidentCount: 0,
        totalIncidentCount: 0,
      },
    ]);

    render(<AdminShiftsScreen />);

    await waitFor(() => {
      expect(screen.getByText("CLOSED OK")).toBeTruthy();
    });

    expect(screen.queryByText(/Cash difference:/)).toBeNull();
    expect(screen.queryByText(/MB difference:/)).toBeNull();
    expect(screen.queryByText(/open incidents/)).toBeNull();
  });
});