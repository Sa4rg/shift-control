import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import NewStoreScreen from "@/app/(admin)/stores/new-store";
import { createStore } from "@/src/api/stores";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    back: jest.fn(),
  },
}));

jest.mock("@/src/api/stores", () => ({
  createStore: jest.fn(),
}));

jest.mock("@/src/components/AppTopBar", () => ({
  AppTopBar: () => null,
}));

const mockedCreateStore = createStore as jest.MockedFunction<
  typeof createStore
>;

describe("NewStoreScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedCreateStore.mockResolvedValue({
      id: "store-1",
      name: "Kings Yard Test",
      address: "Test Address",
      baseCashAmount: 103,
      wifiSsid: "MEO-4A6DA0",
      active: true,
      deactivatedById: null,
      deactivatedByName: null,
      deactivatedAt: null,
    });
  });

  it("creates a store with a trimmed Wi-Fi SSID", async () => {
    render(<NewStoreScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("e.g. Main Station"),
      "Kings Yard Test"
    );

    fireEvent.changeText(
      screen.getByPlaceholderText("e.g. 123 Business St"),
      "Test Address"
    );

    fireEvent.changeText(
      screen.getByPlaceholderText("103.00"),
      "103"
    );

    fireEvent.changeText(
      screen.getByPlaceholderText("e.g. MEO-4A6DA0"),
      "  MEO-4A6DA0  "
    );

    const createStoreElements = screen.getAllByText("Create store");

    fireEvent.press(createStoreElements[1]);

    await waitFor(() => {
      expect(mockedCreateStore).toHaveBeenCalledWith({
        name: "Kings Yard Test",
        address: "Test Address",
        baseCashAmount: 103,
        wifiSsid: "MEO-4A6DA0",
      });
    });

    expect(mockReplace).toHaveBeenCalledWith("/(admin)/dashboard");
  });

    it("keeps the create button disabled when Wi-Fi SSID is blank", () => {
    render(<NewStoreScreen />);

    fireEvent.changeText(
        screen.getByPlaceholderText("e.g. Main Station"),
        "Kings Yard Test"
    );

    fireEvent.changeText(
        screen.getByPlaceholderText("e.g. 123 Business St"),
        "Test Address"
    );

    fireEvent.changeText(
        screen.getByPlaceholderText("103.00"),
        "103"
    );

    fireEvent.changeText(
        screen.getByPlaceholderText("e.g. MEO-4A6DA0"),
        "   "
    );

    const createButton = screen.getByTestId("create-store-button");

    expect(createButton.props.accessibilityState).toEqual(
        expect.objectContaining({
        disabled: true,
        })
    );

    fireEvent.press(createButton);

    expect(mockedCreateStore).not.toHaveBeenCalled();
    });

});