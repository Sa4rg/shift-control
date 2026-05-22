import { listUsers, createStaff, getUserById, deactivateUser } from "@/src/api/users";
import { apiClient } from "@/src/api/client";

jest.mock("@/src/api/client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
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

describe("createStaff", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a staff user", async () => {
    const request = {
      fullName: "New Staff",
      username: "new.staff",
      pin: "123456",
      storeId: "store-1",
    };

    mockedApiClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Staff user created successfully",
        data: {
          id: "user-2",
          fullName: "New Staff",
          username: "new.staff",
          email: null,
          role: "STAFF",
          storeId: "store-1",
          active: true,
          deactivatedById: null,
          deactivatedByName: null,
          deactivatedAt: null,
        },
      },
    });

    const result = await createStaff(request);

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/api/admin/users/staff",
      request
    );
    expect(result.id).toBe("user-2");
    expect(result.role).toBe("STAFF");
  });
});

describe("getUserById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gets a user by id", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "User found",
        data: {
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
      },
    });

    const result = await getUserById("user-1");

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/admin/users/user-1");
    expect(result.id).toBe("user-1");
    expect(result.role).toBe("STAFF");
  });
});

describe("deactivateUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deactivates a user", async () => {
    mockedApiClient.patch.mockResolvedValueOnce({
      data: {
        success: true,
        message: "User deactivated successfully",
        data: {
          id: "user-1",
          fullName: "Sara Staff",
          username: "sara.staff",
          email: null,
          role: "STAFF",
          storeId: "store-1",
          active: false,
          deactivatedById: "admin-1",
          deactivatedByName: "Admin User",
          deactivatedAt: "2026-05-19T10:00:00Z",
        },
      },
    });

    const result = await deactivateUser("user-1");

    expect(mockedApiClient.patch).toHaveBeenCalledWith(
      "/api/admin/users/user-1/deactivate"
    );
    expect(result.active).toBe(false);
    expect(result.deactivatedByName).toBe("Admin User");
  });
});