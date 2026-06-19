import {
  formatLocalDateAsIso,
  parseIsoDateAsLocalDate,
} from "@/src/utils/isoDate";

describe("isoDate utilities", () => {
  describe("formatLocalDateAsIso", () => {
    it("formats a local Date as YYYY-MM-DD", () => {
      const date = new Date(2026, 5, 18);

      expect(formatLocalDateAsIso(date)).toBe("2026-06-18");
    });

    it("pads single-digit months and days", () => {
      const date = new Date(2026, 0, 5);

      expect(formatLocalDateAsIso(date)).toBe("2026-01-05");
    });
  });

  describe("parseIsoDateAsLocalDate", () => {
    it("parses YYYY-MM-DD as a local Date", () => {
      const result = parseIsoDateAsLocalDate("2026-06-18");

      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2026);
      expect(result?.getMonth()).toBe(5);
      expect(result?.getDate()).toBe(18);
    });

    it("returns null for an empty value", () => {
      expect(parseIsoDateAsLocalDate("")).toBeNull();
    });

    it("returns null for an invalid format", () => {
      expect(parseIsoDateAsLocalDate("18/06/2026")).toBeNull();
      expect(parseIsoDateAsLocalDate("2026-6-18")).toBeNull();
    });

    it("returns null for an impossible date", () => {
      expect(parseIsoDateAsLocalDate("2026-02-31")).toBeNull();
    });

    it("round-trips a valid calendar date without changing the day", () => {
      const original = "2026-11-09";

      const parsed = parseIsoDateAsLocalDate(original);

      expect(parsed).not.toBeNull();
      expect(formatLocalDateAsIso(parsed!)).toBe(original);
    });
  });
});