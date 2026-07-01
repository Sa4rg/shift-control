import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import AdminStoreDetailScreen from "@/app/(admin)/stores/[id]";
import { getStoreById } from "@/src/api/stores";

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    back: () => mockBack(),
  },
  useLocalSearchParams: () => ({
    id: "store-1",
  }),
}));

jest.mock("@/src/api/stores", () => ({
  getStoreById: jest.fn(),
  deactivateStore: jest.fn(),
}));

jest.mock("@/src/components/AppTopBar", () => ({
  AppTopBar: () => null,
}));

const mockedGetStoreById = getStoreById as jest.MockedFunction<
  typeof getStoreById
>;

describe("AdminStoreDetailScreen", () => {
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
  });

  it("shows the configured Wi-Fi SSID", async () => {
    render(<AdminStoreDetailScreen />);

    await waitFor(() => {
      expect(mockedGetStoreById).toHaveBeenCalledWith("store-1");
    });

    expect(screen.getByText("WI-FI NETWORK")).toBeTruthy();
    expect(screen.getByText("MEO-4A6DA0")).toBeTruthy();
  });

  it("navigates to the store edit screen", async () => {
    render(<AdminStoreDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("Kings Yard Baixa")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Edit store"));

    expect(mockPush).toHaveBeenCalledWith(
      "/(admin)/stores/store-1/edit"
    );
  });
});