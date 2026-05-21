import { apiClient } from "@/src/api/client";
import type {
  ApiEnvelope,
  CreateIncidentRequest,
  Incident,
  IncidentStatus,
} from "@/src/types/api";

export type ListIncidentsParams = {
  status?: IncidentStatus;
  storeId?: string;
  staffId?: string;
  shiftId?: string;
  closureId?: string;
  saleId?: string;
};

export async function listIncidents(
  params: ListIncidentsParams = {}
): Promise<Incident[]> {
  const response = await apiClient.get<ApiEnvelope<Incident[]>>(
    "/api/incidents",
    {
      params,
    }
  );

  return response.data.data;
}

export async function createIncident(
  request: CreateIncidentRequest
): Promise<Incident> {
  const response = await apiClient.post<ApiEnvelope<Incident>>(
    "/api/incidents",
    request
  );

  return response.data.data;
}

export async function getIncidentById(id: string): Promise<Incident> {
  const response = await apiClient.get<ApiEnvelope<Incident>>(
    `/api/incidents/${id}`
  );

  return response.data.data;
}

export type ResolveIncidentRequest = {
  resolutionNote: string;
};

export async function resolveIncident(
  id: string,
  request: ResolveIncidentRequest
): Promise<Incident> {
  const response = await apiClient.patch<ApiEnvelope<Incident>>(
    `/api/incidents/${id}/resolve`,
    request
  );

  return response.data.data;
}