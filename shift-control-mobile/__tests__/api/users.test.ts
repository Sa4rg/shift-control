import { listUsers } from "@/src/api/users";
import { apiClient } from "@/src/api/client";

jest.mock("@/src/api/client", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("listUsers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists users without filters", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Users listed successfully",
        data: [
          {
            id: "user-1",
            fullName: "Sara Staff",
            username: "sara.staff",
            email: null,
            role: "STAFF",
            storeId: "store-1",
            active: true,
            deactivatedById: null,
            deactivatedByName: null,
            deactivatedAt: null,
          },
        ],
      },
    });

    const result = await listUsers();

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/admin/users", {
      params: {},
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("user-1");
    expect(result[0].role).toBe("STAFF");
  });

  it("lists users with filters", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Users listed successfully",
        data: [],
      },
    });

    await listUsers({
      role: "STAFF",
      includeInactive: true,
    });

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/admin/users", {
      params: {
        role: "STAFF",
        includeInactive: true,
      },
    });
  });
});