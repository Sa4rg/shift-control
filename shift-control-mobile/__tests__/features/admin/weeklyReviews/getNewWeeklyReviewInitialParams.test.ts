import { getNewWeeklyReviewInitialParams } from "@/src/features/admin/weeklyReviews/getNewWeeklyReviewInitialParams";

describe("getNewWeeklyReviewInitialParams", () => {
  it("returns valid string route parameters", () => {
    const result = getNewWeeklyReviewInitialParams({
      storeId: "store-1",
      staffId: "staff-1",
      weekStart: "2026-05-18",
    });

    expect(result).toEqual({
      storeId: "store-1",
      staffId: "staff-1",
      weekStart: "2026-05-18",
    });
  });

  it("uses the first value when Expo Router provides arrays", () => {
    const result = getNewWeeklyReviewInitialParams({
      storeId: ["store-1", "store-2"],
      staffId: ["staff-1"],
      weekStart: ["2026-05-18"],
    });

    expect(result).toEqual({
      storeId: "store-1",
      staffId: "staff-1",
      weekStart: "2026-05-18",
    });
  });

  it("returns null for missing or blank parameters", () => {
    const result = getNewWeeklyReviewInitialParams({
      storeId: undefined,
      staffId: "",
      weekStart: ["   "],
    });

    expect(result).toEqual({
      storeId: null,
      staffId: null,
      weekStart: null,
    });
  });

  it("trims parameter values", () => {
    const result = getNewWeeklyReviewInitialParams({
      storeId: " store-1 ",
      staffId: " staff-1 ",
      weekStart: " 2026-05-18 ",
    });

    expect(result).toEqual({
      storeId: "store-1",
      staffId: "staff-1",
      weekStart: "2026-05-18",
    });
  });
});