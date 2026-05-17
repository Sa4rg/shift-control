import { AxiosError } from "axios";

import { apiClient } from "@/src/api/client";
import type { ApiEnvelope, Shift, ShiftType } from "@/src/types/api";

export type CurrentShiftResult =
  | {
      status: "active";
      shift: Shift;
    }
  | {
      status: "none";
      shift: null;
    };

export type OpenShiftRequest = {
  type: ShiftType;
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

export async function openShift(request: OpenShiftRequest): Promise<Shift> {
  const response = await apiClient.post<ApiEnvelope<Shift>>(
    "/api/shifts/open",
    request
  );

  return response.data.data;
}