import { formatMoney } from "@/src/utils/money";

describe("formatMoney", () => {
  it("formats money with euro symbol and two decimals", () => {
    expect(formatMoney(20)).toBe("€20.00");
    expect(formatMoney(1.5)).toBe("€1.50");
  });
});