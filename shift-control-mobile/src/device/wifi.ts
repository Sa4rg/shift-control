import NetInfo, {
  NetInfoStateType,
} from "@react-native-community/netinfo";
import * as Location from "expo-location";

export type WifiConnectionResult =
  | {
      status: "connected";
      ssid: string;
    }
  | {
      status: "not_connected";
    }
  | {
      status: "permission_denied";
    }
  | {
      status: "ssid_unavailable";
    };

export async function getCurrentWifiSsid(): Promise<WifiConnectionResult> {
  let permission = await Location.getForegroundPermissionsAsync();

  if (!permission.granted) {
    permission = await Location.requestForegroundPermissionsAsync();
  }

  if (!permission.granted) {
    return {
      status: "permission_denied",
    };
  }

  const networkState = await NetInfo.fetch();

  if (
    networkState.type !== NetInfoStateType.wifi ||
    networkState.isConnected !== true
  ) {
    return {
      status: "not_connected",
    };
  }

  const ssid = networkState.details.ssid?.trim();

  if (!ssid) {
    return {
      status: "ssid_unavailable",
    };
  }

  return {
    status: "connected",
    ssid,
  };
}