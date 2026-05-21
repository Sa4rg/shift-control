import { listStores, getStoreById, createStore } from "@/src/api/stores";
import { apiClient } from "@/src/api/client";

jest.mock("@/src/api/client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("listStores", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists stores without filters", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Stores listed successfully",
        data: [
          {
            id: "store-1",
            name: "Main Store",
            address: "Main Street 123",
            baseCashAmount: 103,
            active: true,
            deactivatedById: null,
            deactivatedByName: null,
            deactivatedAt: null,
          },
        ],
      },
    });

    const result = await listStores();

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/stores", {
      params: {},
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("store-1");
    expect(result[0].baseCashAmount).toBe(103);
  });

  it("lists stores with filters", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Stores listed successfully",
        data: [],
      },
    });

    await listStores({
      search: "main",
      includeInactive: true,
    });

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/stores", {
      params: {
        search: "main",
        includeInactive: true,
      },
    });
  });
});

describe("getStoreById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gets a store by id", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Store found",
        data: {
          id: "store-1",
          name: "Main Store",
          address: "Main Street 123",
          baseCashAmount: 103,
          active: true,
          deactivatedById: null,
          deactivatedByName: null,
          deactivatedAt: null,
        },
      },
    });

    const result = await getStoreById("store-1");

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/stores/store-1");
    expect(result.id).toBe("store-1");
    expect(result.name).toBe("Main Store");
  });
});

describe("createStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a store", async () => {
    const request = {
      name: "New Store",
      address: "New Street 123",
      baseCashAmount: 103,
    };

    mockedApiClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Store created successfully",
        data: {
          id: "store-2",
          name: "New Store",
          address: "New Street 123",
          baseCashAmount: 103,
          active: true,
          deactivatedById: null,
          deactivatedByName: null,
          deactivatedAt: null,
        },
      },
    });

    const result = await createStore(request);

    expect(mockedApiClient.post).toHaveBeenCalledWith("/api/stores", request);
    expect(result.id).toBe("store-2");
    expect(result.active).toBe(true);
  });
});