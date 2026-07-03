import NetInfo, {
  NetInfoStateType,
} from "@react-native-community/netinfo";
import * as Location from "expo-location";

import { getCurrentWifiSsid } from "@/src/device/wifi";

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(),
  },
  NetInfoStateType: {
    wifi: "wifi",
    cellular: "cellular",
    none: "none",
    unknown: "unknown",
  },
}));

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
}));

const mockedFetch = NetInfo.fetch as jest.MockedFunction<
  typeof NetInfo.fetch
>;

const mockedGetForegroundPermissions =
  Location.getForegroundPermissionsAsync as jest.MockedFunction<
    typeof Location.getForegroundPermissionsAsync
  >;

const mockedRequestForegroundPermissions =
  Location.requestForegroundPermissionsAsync as jest.MockedFunction<
    typeof Location.requestForegroundPermissionsAsync
  >;

describe("getCurrentWifiSsid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the current SSID when permission is granted and Wi-Fi is connected", async () => {
    mockedGetForegroundPermissions.mockResolvedValue({
      granted: true,
    } as Location.LocationPermissionResponse);

    mockedFetch.mockResolvedValue({
      type: NetInfoStateType.wifi,
      isConnected: true,
      isInternetReachable: true,
      details: {
        ssid: "MEO-4A6DA0",
      },
    } as Awaited<ReturnType<typeof NetInfo.fetch>>);

    const result = await getCurrentWifiSsid();

    expect(result).toEqual({
      status: "connected",
      ssid: "MEO-4A6DA0",
    });

    expect(
      mockedRequestForegroundPermissions
    ).not.toHaveBeenCalled();
  });

  it("requests foreground permission and returns the SSID when permission is granted", async () => {
    mockedGetForegroundPermissions.mockResolvedValue({
      granted: false,
    } as Location.LocationPermissionResponse);

    mockedRequestForegroundPermissions.mockResolvedValue({
      granted: true,
    } as Location.LocationPermissionResponse);

    mockedFetch.mockResolvedValue({
      type: NetInfoStateType.wifi,
      isConnected: true,
      isInternetReachable: true,
      details: {
        ssid: "MEO-7EBD50",
      },
    } as Awaited<ReturnType<typeof NetInfo.fetch>>);

    const result = await getCurrentWifiSsid();

    expect(
      mockedRequestForegroundPermissions
    ).toHaveBeenCalledTimes(1);

    expect(mockedFetch).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      status: "connected",
      ssid: "MEO-7EBD50",
    });
  });

  it("returns permission_denied without checking the network when permission is rejected", async () => {
    mockedGetForegroundPermissions.mockResolvedValue({
      granted: false,
    } as Location.LocationPermissionResponse);

    mockedRequestForegroundPermissions.mockResolvedValue({
      granted: false,
    } as Location.LocationPermissionResponse);

    const result = await getCurrentWifiSsid();

    expect(
      mockedRequestForegroundPermissions
    ).toHaveBeenCalledTimes(1);

    expect(mockedFetch).not.toHaveBeenCalled();

    expect(result).toEqual({
      status: "permission_denied",
    });
  });

  it("returns not_connected when the device is using a non-Wi-Fi connection", async () => {
    mockedGetForegroundPermissions.mockResolvedValue({
      granted: true,
    } as Location.LocationPermissionResponse);

    mockedFetch.mockResolvedValue({
      type: NetInfoStateType.cellular,
      isConnected: true,
      isInternetReachable: true,
      details: {},
    } as Awaited<ReturnType<typeof NetInfo.fetch>>);

    const result = await getCurrentWifiSsid();

    expect(
      mockedRequestForegroundPermissions
    ).not.toHaveBeenCalled();

    expect(mockedFetch).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      status: "not_connected",
    });
  });

  it("returns not_connected when Wi-Fi is detected but not connected", async () => {
    mockedGetForegroundPermissions.mockResolvedValue({
      granted: true,
    } as Location.LocationPermissionResponse);

    mockedFetch.mockResolvedValue({
      type: NetInfoStateType.wifi,
      isConnected: false,
      isInternetReachable: false,
      details: {
        ssid: null,
      },
    } as Awaited<ReturnType<typeof NetInfo.fetch>>);

    const result = await getCurrentWifiSsid();

    expect(
      mockedRequestForegroundPermissions
    ).not.toHaveBeenCalled();

    expect(mockedFetch).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      status: "not_connected",
    });
  });

  it("returns ssid_unavailable when Wi-Fi is connected but the SSID is missing", async () => {
    mockedGetForegroundPermissions.mockResolvedValue({
      granted: true,
    } as Location.LocationPermissionResponse);

    mockedFetch.mockResolvedValue({
      type: NetInfoStateType.wifi,
      isConnected: true,
      isInternetReachable: true,
      details: {
        ssid: null,
      },
    } as Awaited<ReturnType<typeof NetInfo.fetch>>);

    const result = await getCurrentWifiSsid();

    expect(
      mockedRequestForegroundPermissions
    ).not.toHaveBeenCalled();

    expect(mockedFetch).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      status: "ssid_unavailable",
    });
  });

  it("returns ssid_unavailable when the SSID contains only whitespace", async () => {
    mockedGetForegroundPermissions.mockResolvedValue({
      granted: true,
    } as Location.LocationPermissionResponse);

    mockedFetch.mockResolvedValue({
      type: NetInfoStateType.wifi,
      isConnected: true,
      isInternetReachable: true,
      details: {
        ssid: "   ",
      },
    } as Awaited<ReturnType<typeof NetInfo.fetch>>);

    const result = await getCurrentWifiSsid();

    expect(mockedFetch).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      status: "ssid_unavailable",
    });
  });

  it("trims surrounding whitespace from the current SSID", async () => {
    mockedGetForegroundPermissions.mockResolvedValue({
      granted: true,
    } as Location.LocationPermissionResponse);

    mockedFetch.mockResolvedValue({
      type: NetInfoStateType.wifi,
      isConnected: true,
      isInternetReachable: true,
      details: {
        ssid: "  MEO-4A6DA0  ",
      },
    } as Awaited<ReturnType<typeof NetInfo.fetch>>);

    const result = await getCurrentWifiSsid();

    expect(mockedFetch).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      status: "connected",
      ssid: "MEO-4A6DA0",
    });
  });
});