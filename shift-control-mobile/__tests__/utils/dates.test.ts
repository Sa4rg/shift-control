import { formatDateTime } from "@/src/utils/dates";

describe("formatDateTime", () => {
  it("returns the original value when date is invalid", () => {
    expect(formatDateTime("invalid-date")).toBe("invalid-date");
  });

  it("formats a valid ISO date", () => {
    const result = formatDateTime("2026-05-17T11:36:27Z");

    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe("2026-05-17T11:36:27Z");
  });
});