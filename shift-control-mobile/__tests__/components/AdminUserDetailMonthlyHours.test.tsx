import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, router } from "expo-router";

import AdminUserDetailScreen from "@/app/(admin)/users/[id]";
import * as usersApi from "@/src/api/users";
import * as storesApi from "@/src/api/stores";
import type { AdminUser, MonthlyWorkHours, Store } from "@/src/types/api";

jest.mock("@/src/config/env", () => ({
  env: {
    apiBaseUrl: "http://localhost:8080",
  },
}));

jest.mock("@/src/components/AppTopBar", () => ({
  AppTopBar: () => null,
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
}));

jest.mock("@/src/api/users");
jest.mock("@/src/api/stores");

const mockUsersApi = usersApi as jest.Mocked<typeof usersApi>;
const mockStoresApi = storesApi as jest.Mocked<typeof storesApi>;
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;

const staffUser: AdminUser = {
  id: "staff-123",
  fullName: "John Staff",
  username: "jstaff",
  email: "john@example.com",
  role: "STAFF",
  storeId: "store-456",
  active: true,
  deactivatedById: null,
  deactivatedByName: null,
  deactivatedAt: null,
};

const adminUser: AdminUser = {
  id: "admin-456",
  fullName: "Admin User",
  username: "admin",
  email: "admin@example.com",
  role: "ADMIN",
  storeId: null,
  active: true,
  deactivatedById: null,
  deactivatedByName: null,
  deactivatedAt: null,
};

const mockStore: Store = {
  id: "store-456",
  name: "Main Store",
  address: "123 Main St",
  baseCashAmount: 103,
  wifiSsid: null,
  active: true,
  deactivatedById: null,
  deactivatedByName: null,
  deactivatedAt: null,
};

const mockMonthlyHours: MonthlyWorkHours = {
  staffId: "staff-123",
  staffName: "John Staff",
  year: 2026,
  month: 7,
  totalMinutes: 810,
  closedShiftCount: 8,
};

describe("AdminUserDetailScreen - Monthly Hours", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("when user is STAFF", () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({ id: "staff-123" });
      mockUsersApi.getUserById.mockResolvedValue(staffUser);
      mockStoresApi.getStoreById.mockResolvedValue(mockStore);
      mockUsersApi.getUserMonthlyWorkHours.mockResolvedValue(mockMonthlyHours);
    });

    it("should render Monthly hours card", async () => {
      const { getByText } = render(<AdminUserDetailScreen />);

      await waitFor(() => {
        expect(getByText("Monthly hours")).toBeTruthy();
      });
    });

    it("should call getUserMonthlyWorkHours with current year and month", async () => {
      const now = new Date();
      const expectedYear = now.getFullYear();
      const expectedMonth = now.getMonth() + 1;

      render(<AdminUserDetailScreen />);

      await waitFor(() => {
        expect(mockUsersApi.getUserMonthlyWorkHours).toHaveBeenCalledWith(
          "staff-123",
          expectedYear,
          expectedMonth
        );
      });
    });

    it("should render total hours formatted as 13h 30m", async () => {
      const { getByText } = render(<AdminUserDetailScreen />);

      await waitFor(() => {
        expect(getByText("13h 30m")).toBeTruthy();
      });
    });

    it("should render closed shift count", async () => {
      const { getByText } = render(<AdminUserDetailScreen />);

      await waitFor(() => {
        expect(getByText("SHIFTS CLOSED")).toBeTruthy();
        expect(getByText("8")).toBeTruthy();
      });
    });

    it("should call API with previous month when pressing previous button", async () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const expectedMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const expectedYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const { getAllByText } = render(<AdminUserDetailScreen />);

    await waitFor(() => {
        expect(mockUsersApi.getUserMonthlyWorkHours).toHaveBeenCalledWith(
        "staff-123",
        currentYear,
        currentMonth
        );
    });

    await waitFor(() => {
        expect(getAllByText("←").length).toBeGreaterThan(0);
    });

    mockUsersApi.getUserMonthlyWorkHours.mockClear();

    fireEvent.press(getAllByText("←")[0]);

    await waitFor(() => {
        expect(mockUsersApi.getUserMonthlyWorkHours).toHaveBeenCalledWith(
        "staff-123",
        expectedYear,
        expectedMonth
        );
    });
    });

    it("should call API with next month when pressing next button", async () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const expectedMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const expectedYear = currentMonth === 12 ? currentYear + 1 : currentYear;

    const { getAllByText } = render(<AdminUserDetailScreen />);

    await waitFor(() => {
        expect(mockUsersApi.getUserMonthlyWorkHours).toHaveBeenCalledWith(
        "staff-123",
        currentYear,
        currentMonth
        );
    });

    await waitFor(() => {
        expect(getAllByText("→").length).toBeGreaterThan(0);
    });

    mockUsersApi.getUserMonthlyWorkHours.mockClear();

    fireEvent.press(getAllByText("→")[0]);

    await waitFor(() => {
        expect(mockUsersApi.getUserMonthlyWorkHours).toHaveBeenCalledWith(
        "staff-123",
        expectedYear,
        expectedMonth
        );
    });
    });

    it("should display error message when API fails", async () => {
      mockUsersApi.getUserMonthlyWorkHours.mockRejectedValue(
        new Error("Failed to load monthly hours")
      );

      const { getByText } = render(<AdminUserDetailScreen />);

      await waitFor(() => {
        expect(
          getByText(/Something went wrong|Failed to load monthly hours/i)
        ).toBeTruthy();
      });
    });
  });

  describe("when user is ADMIN", () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({ id: "admin-456" });
      mockUsersApi.getUserById.mockResolvedValue(adminUser);
    });

    it("should NOT render Monthly hours card", async () => {
      const { queryByText } = render(<AdminUserDetailScreen />);

      await waitFor(() => {
        expect(queryByText("Monthly hours")).toBeNull();
      });
    });

    it("should NOT call getUserMonthlyWorkHours", async () => {
      render(<AdminUserDetailScreen />);

      await waitFor(() => {
        expect(mockUsersApi.getUserById).toHaveBeenCalled();
      });

      expect(mockUsersApi.getUserMonthlyWorkHours).not.toHaveBeenCalled();
    });
  });
});
