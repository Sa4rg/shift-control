import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import CloseShiftConfirmScreen from "@/app/(staff)/close-shift/confirm";
import { closeShift } from "@/src/api/shifts";
import { getCurrentWifiSsid } from "@/src/device/wifi";

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({
    shiftId: "shift-1",
    expectedCash: "273",
    expectedMb: "80",
    cashToWithdraw: "170",
  }),
}));

jest.mock("@/src/api/shifts", () => ({
  closeShift: jest.fn(),
}));

jest.mock("@/src/device/wifi", () => ({
  getCurrentWifiSsid: jest.fn(),
}));

jest.mock("@/src/components/AppTopBar", () => ({
  AppTopBar: () => null,
}));

const mockedCloseShift =
  closeShift as jest.MockedFunction<typeof closeShift>;

const mockedGetCurrentWifiSsid =
  getCurrentWifiSsid as jest.MockedFunction<
    typeof getCurrentWifiSsid
  >;

describe("CloseShiftConfirmScreen Wi-Fi validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedGetCurrentWifiSsid.mockResolvedValue({
      status: "connected",
      ssid: "MEO-4A6DA0",
    });

    mockedCloseShift.mockResolvedValue({
      id: "closure-1",
      shiftId: "shift-1",
      closedById: "staff-1",
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
      status: "CLOSED_OK",
      note: null,
      createdAt: "2026-05-16T16:00:00Z",
      updatedAt: "2026-05-16T16:00:00Z",
    });
  });

  it("closes the shift with the current Wi-Fi SSID", async () => {
    render(<CloseShiftConfirmScreen />);

    const amountInputs =
      screen.getAllByPlaceholderText("0.00");

    fireEvent.changeText(amountInputs[0], "273");
    fireEvent.changeText(amountInputs[1], "80");

    const closeShiftLabels =
      screen.getAllByText("Close shift");

    fireEvent.press(
      closeShiftLabels[closeShiftLabels.length - 1]
    );

    await waitFor(() => {
      expect(
        mockedGetCurrentWifiSsid
      ).toHaveBeenCalledTimes(1);

      expect(mockedCloseShift).toHaveBeenCalledWith(
        "shift-1",
        {
          confirmedCashAmount: 273,
          confirmedMbAmount: 80,
          note: null,
          wifiSsid: "MEO-4A6DA0",
        }
      );
    });

    expect(
      await screen.findByText("Shift closed successfully")
    ).toBeTruthy();
  });

  it("blocks closing without Wi-Fi and lets the staff dismiss the message", async () => {
    mockedGetCurrentWifiSsid.mockResolvedValueOnce({
        status: "not_connected",
    });

    render(<CloseShiftConfirmScreen />);

    const amountInputs =
        screen.getAllByPlaceholderText("0.00");

    fireEvent.changeText(amountInputs[0], "273");
    fireEvent.changeText(amountInputs[1], "80");

    const closeShiftLabels =
        screen.getAllByText("Close shift");

    fireEvent.press(
        closeShiftLabels[closeShiftLabels.length - 1]
    );

    const wifiMessage = await screen.findByText(
        "You are not connected to Wi-Fi. Connect to the store Wi-Fi network and try again."
    );

    expect(wifiMessage).toBeTruthy();

    expect(
        mockedGetCurrentWifiSsid
    ).toHaveBeenCalledTimes(1);

    expect(mockedCloseShift).not.toHaveBeenCalled();

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