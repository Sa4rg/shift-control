import { AxiosError } from "axios";

import { getApiErrorMessage } from "@/src/api/errors";

describe("getApiErrorMessage", () => {
  it("returns backend message when available", () => {
    const error = new AxiosError(
      "Request failed",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        data: {
          success: false,
          message: "Invalid credentials",
          data: null,
        },
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: {} as never,
      }
    );

    expect(getApiErrorMessage(error)).toBe("Invalid credentials");
  });

  it("returns connection message when there is no response", () => {
    const error = new AxiosError("Network Error");

    expect(getApiErrorMessage(error)).toBe("Could not connect to the server.");
  });

  it("returns generic message for unknown errors", () => {
    expect(getApiErrorMessage(new Error("Unexpected"))).toBe(
      "Something went wrong. Please try again."
    );
  });
});