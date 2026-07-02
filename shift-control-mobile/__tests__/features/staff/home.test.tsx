import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import StaffHomeScreen from "@/app/(staff)/home";
import {
  getCurrentShift,
  openShift,
} from "@/src/api/shifts";
import { getCurrentWifiSsid } from "@/src/device/wifi";

jest.mock("expo-router", () => {
  const React = require("react");

  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
    },
    useFocusEffect: (callback: () => void) => {
      React.useEffect(callback, [callback]);
    },
  };
});

jest.mock("@/src/api/shifts", () => ({
  getCurrentShift: jest.fn(),
  openShift: jest.fn(),
}));

jest.mock("@/src/api/sales", () => ({
  listCurrentShiftSales: jest.fn(),
}));

jest.mock("@/src/device/wifi", () => ({
  getCurrentWifiSsid: jest.fn(),
}));

jest.mock("@/src/auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "staff-1",
      username: "sara.staff",
      fullName: "Sara Staff",
      role: "STAFF",
      storeId: "store-1",
    },
    logout: jest.fn(),
  }),
}));

jest.mock("@/src/components/AppTopBar", () => ({
  AppTopBar: () => null,
}));

const mockedGetCurrentShift =
  getCurrentShift as jest.MockedFunction<
    typeof getCurrentShift
  >;

const mockedOpenShift =
  openShift as jest.MockedFunction<typeof openShift>;

const mockedGetCurrentWifiSsid =
  getCurrentWifiSsid as jest.MockedFunction<
    typeof getCurrentWifiSsid
  >;

describe("StaffHomeScreen Wi-Fi shift opening", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedGetCurrentShift.mockResolvedValue({
      status: "none",
      shift: null,
    });

    mockedGetCurrentWifiSsid.mockResolvedValue({
      status: "connected",
      ssid: "MEO-4A6DA0",
    });

    mockedOpenShift.mockResolvedValue(
      {} as Awaited<ReturnType<typeof openShift>>
    );
  });

  it("opens a day shift with the current Wi-Fi SSID", async () => {
    render(<StaffHomeScreen />);

    const openDayShiftButton = await screen.findByText(
      "Open day shift"
    );

    fireEvent.press(openDayShiftButton);

    await waitFor(() => {
      expect(
        mockedGetCurrentWifiSsid
      ).toHaveBeenCalledTimes(1);

      expect(mockedOpenShift).toHaveBeenCalledWith({
        type: "DAY",
        wifiSsid: "MEO-4A6DA0",
      });
    });
  });

  it("blocks opening without Wi-Fi and lets the staff dismiss the message", async () => {
    mockedGetCurrentWifiSsid.mockResolvedValueOnce({
        status: "not_connected",
    });

    render(<StaffHomeScreen />);

    const openDayShiftButton = await screen.findByText(
        "Open day shift"
    );

    fireEvent.press(openDayShiftButton);

    const wifiMessage = await screen.findByText(
        "You are not connected to Wi-Fi. Connect to the store Wi-Fi network and try again."
    );

    expect(wifiMessage).toBeTruthy();
    expect(mockedOpenShift).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Got it"));

    await waitFor(() => {
        expect(
        screen.queryByText(
            "You are not connected to Wi-Fi. Connect to the store Wi-Fi network and try again."
        )
        ).toBeNull();
    });
    });
});