import { AxiosError } from "axios";

import { apiClient } from "@/src/api/client";
import type { ApiEnvelope, Shift } from "@/src/types/api";

export type CurrentShiftResult =
  | {
      status: "active";
      shift: Shift;
    }
  | {
      status: "none";
      shift: null;
    };

export async function getCurrentShift(): Promise<CurrentShiftResult> {
  try {
    const response = await apiClient.get<ApiEnvelope<Shift>>(
      "/api/shifts/current"
    );

    return {
      status: "active",
      shift: response.data.data,
    };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return {
        status: "none",
        shift: null,
      };
    }

    throw error;
  }
}