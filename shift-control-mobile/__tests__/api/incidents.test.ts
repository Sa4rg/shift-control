import { createIncident, getIncidentById, listIncidents, resolveIncident } from "@/src/api/incidents";
import { apiClient } from "@/src/api/client";

jest.mock("@/src/api/client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("listIncidents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists incidents without filters", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Incidents listed successfully",
        data: [
          {
            id: "incident-1",
            type: "CASH_DIFFERENCE",
            title: "Cash short",
            description: "Register had less cash than expected",
            severity: "MEDIUM",
            status: "OPEN",
            shiftId: "shift-1",
            closureId: null,
            saleId: null,
            createdAt: "2026-05-17T10:00:00Z",
            resolvedAt: null,
            resolutionNote: null,
          },
        ],
      },
    });

    const result = await listIncidents();

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/incidents", {
      params: {},
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("incident-1");
  });

  it("lists incidents filtered by status", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Incidents listed successfully",
        data: [],
      },
    });

    await listIncidents({ status: "OPEN" });

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/incidents", {
      params: {
        status: "OPEN",
      },
    });
  });

  it("lists incidents with admin filters", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Incidents listed successfully",
        data: [],
      },
    });

    const result = await listIncidents({
      status: "OPEN",
      storeId: "store-1",
      staffId: "staff-1",
      shiftId: "shift-1",
      closureId: "closure-1",
      saleId: "sale-1",
    });

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/incidents", {
      params: {
        status: "OPEN",
        storeId: "store-1",
        staffId: "staff-1",
        shiftId: "shift-1",
        closureId: "closure-1",
        saleId: "sale-1",
      },
    });
    expect(result).toEqual([]);
  });
});

describe("createIncident", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates an incident", async () => {
    const request = {
      type: "CASH_DIFFERENCE" as const,
      title: "Cash short by 5 EUR",
      description: "Register had 5 EUR less than expected at close",
      severity: "MEDIUM" as const,
      shiftId: "shift-1",
    };

    mockedApiClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Incident created successfully",
        data: {
          id: "incident-1",
          ...request,
          status: "OPEN",
          closureId: null,
          saleId: null,
          createdAt: "2026-05-17T10:00:00Z",
          resolvedAt: null,
          resolutionNote: null,
        },
      },
    });

    const result = await createIncident(request);

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/api/incidents",
      request
    );
    expect(result.id).toBe("incident-1");
    expect(result.status).toBe("OPEN");
  });
});

describe("getIncidentById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gets an incident by id", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Incident found",
        data: {
          id: "incident-1",
          type: "CASH_DIFFERENCE",
          title: "Cash short",
          description: "Register had less cash than expected",
          severity: "MEDIUM",
          status: "OPEN",
          shiftId: "shift-1",
          closureId: null,
          saleId: null,
          createdAt: "2026-05-17T10:00:00Z",
          resolvedAt: null,
          resolutionNote: null,
        },
      },
    });

    const result = await getIncidentById("incident-1");

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/api/incidents/incident-1"
    );
    expect(result.id).toBe("incident-1");
    expect(result.description).toBe("Register had less cash than expected");
  });
});

describe("resolveIncident", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves an incident with a resolution note", async () => {
    const request = {
      resolutionNote: "Cash difference reviewed and accepted.",
    };

    mockedApiClient.patch.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Incident resolved successfully",
        data: {
          id: "incident-1",
          type: "CASH_DIFFERENCE",
          title: "Cash short",
          description: "Register had less cash than expected",
          severity: "MEDIUM",
          status: "RESOLVED",
          shiftId: "shift-1",
          closureId: null,
          saleId: null,
          reportedById: "staff-1",
          reportedByName: "Sara Staff",
          resolvedById: "admin-1",
          resolvedByName: "Admin User",
          createdAt: "2026-05-17T10:00:00Z",
          updatedAt: "2026-05-17T11:00:00Z",
          resolvedAt: "2026-05-17T11:00:00Z",
          resolutionNote: "Cash difference reviewed and accepted.",
        },
      },
    });

    const result = await resolveIncident("incident-1", request);

    expect(mockedApiClient.patch).toHaveBeenCalledWith(
      "/api/incidents/incident-1/resolve",
      request
    );
    expect(result.status).toBe("RESOLVED");
    expect(result.resolutionNote).toBe(
      "Cash difference reviewed and accepted."
    );
  });
});