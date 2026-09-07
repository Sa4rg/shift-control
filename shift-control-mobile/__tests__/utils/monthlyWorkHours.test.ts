import {
  formatMinutesAsHours,
  formatMonthLabel,
  getNextMonth,
  getPreviousMonth,
} from "@/src/utils/monthlyWorkHours";

describe("formatMinutesAsHours", () => {
  it("should format 810 minutes as 13h 30m", () => {
    expect(formatMinutesAsHours(810)).toBe("13h 30m");
  });

  it("should format 540 minutes as 9h 00m", () => {
    expect(formatMinutesAsHours(540)).toBe("9h 00m");
  });

  it("should format 0 minutes as 0h 00m", () => {
    expect(formatMinutesAsHours(0)).toBe("0h 00m");
  });

  it("should format 65 minutes as 1h 05m", () => {
    expect(formatMinutesAsHours(65)).toBe("1h 05m");
  });
});

describe("formatMonthLabel", () => {
  it("should format July 2026 correctly", () => {
    expect(formatMonthLabel(2026, 7)).toBe("July 2026");
  });

  it("should format January 2026 correctly", () => {
    expect(formatMonthLabel(2026, 1)).toBe("January 2026");
  });

  it("should format December 2025 correctly", () => {
    expect(formatMonthLabel(2025, 12)).toBe("December 2025");
  });
});

describe("getPreviousMonth", () => {
  it("should return June 2026 when given July 2026", () => {
    const result = getPreviousMonth(2026, 7);
    expect(result).toEqual({ year: 2026, month: 6 });
  });

  it("should return December 2025 when given January 2026", () => {
    const result = getPreviousMonth(2026, 1);
    expect(result).toEqual({ year: 2025, month: 12 });
  });
});

describe("getNextMonth", () => {
  it("should return August 2026 when given July 2026", () => {
    const result = getNextMonth(2026, 7);
    expect(result).toEqual({ year: 2026, month: 8 });
  });

  it("should return January 2027 when given December 2026", () => {
    const result = getNextMonth(2026, 12);
    expect(result).toEqual({ year: 2027, month: 1 });
  });
});
