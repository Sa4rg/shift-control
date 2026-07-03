import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import EditStoreScreen from "@/app/(admin)/stores/[id]/edit";
import { getStoreById, updateStore } from "@/src/api/stores";

const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    back: () => mockBack(),
  },
  useLocalSearchParams: () => ({
    id: "store-1",
  }),
}));

jest.mock("@/src/api/stores", () => ({
  getStoreById: jest.fn(),
  updateStore: jest.fn(),
}));

jest.mock("@/src/components/AppTopBar", () => ({
  AppTopBar: () => null,
}));

const mockedGetStoreById = getStoreById as jest.MockedFunction<
  typeof getStoreById
>;

const mockedUpdateStore = updateStore as jest.MockedFunction<
  typeof updateStore
>;

describe("EditStoreScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedGetStoreById.mockResolvedValue({
      id: "store-1",
      name: "Kings Yard Baixa",
      address: "Largo São Luís, 27 Porto",
      baseCashAmount: 99,
      wifiSsid: "MEO-4A6DA0",
      active: true,
      deactivatedById: null,
      deactivatedByName: null,
      deactivatedAt: null,
    });

    mockedUpdateStore.mockResolvedValue({
      id: "store-1",
      name: "Kings Yard Baixa Updated",
      address: "Updated Address",
      baseCashAmount: 105,
      wifiSsid: "MEO-NEW-WIFI",
      active: true,
      deactivatedById: null,
      deactivatedByName: null,
      deactivatedAt: null,
    });
  });

  it("loads and displays the current store values", async () => {
    render(<EditStoreScreen />);

    expect(
      await screen.findByDisplayValue("Kings Yard Baixa")
    ).toBeTruthy();

    expect(
      screen.getByDisplayValue("Largo São Luís, 27 Porto")
    ).toBeTruthy();

    expect(
      screen.getByDisplayValue("99")
    ).toBeTruthy();

    expect(
      screen.getByDisplayValue("MEO-4A6DA0")
    ).toBeTruthy();

    expect(mockedGetStoreById).toHaveBeenCalledWith(
      "store-1"
    );
  });

  it("updates the store with trimmed values and returns to the detail screen", async () => {
    render(<EditStoreScreen />);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("Kings Yard Baixa")
      ).toBeTruthy();
    });

    fireEvent.changeText(
      screen.getByDisplayValue("Kings Yard Baixa"),
      "  Kings Yard Baixa Updated  "
    );

    fireEvent.changeText(
      screen.getByDisplayValue("Largo São Luís, 27 Porto"),
      "  Updated Address  "
    );

    fireEvent.changeText(
      screen.getByDisplayValue("99"),
      "105"
    );

    fireEvent.changeText(
      screen.getByDisplayValue("MEO-4A6DA0"),
      "  MEO-NEW-WIFI  "
    );

    fireEvent.press(screen.getByText("Save changes"));

    await waitFor(() => {
      expect(mockedUpdateStore).toHaveBeenCalledWith("store-1", {
        name: "Kings Yard Baixa Updated",
        address: "Updated Address",
        baseCashAmount: 105,
        wifiSsid: "MEO-NEW-WIFI",
      });
    });

    expect(mockReplace).toHaveBeenCalledWith(
      "/(admin)/stores/store-1"
    );
  });

  it("loads a legacy store with no Wi-Fi SSID without crashing", async () => {
    mockedGetStoreById.mockResolvedValueOnce({
      id: "store-1",
      name: "Legacy Store",
      address: "123 Business St",
      baseCashAmount: 103,
      wifiSsid: null,
      active: true,
      deactivatedById: null,
      deactivatedByName: null,
      deactivatedAt: null,
    });

    render(<EditStoreScreen />);

    const wifiInput = await screen.findByPlaceholderText(
      "e.g. MEO-4A6DA0"
    );

    expect(wifiInput.props.value).toBe("");

    expect(
      screen.getByTestId("save-store-button").props.accessibilityState
        ?.disabled
    ).toBe(true);

    expect(mockedUpdateStore).not.toHaveBeenCalled();
  });
});