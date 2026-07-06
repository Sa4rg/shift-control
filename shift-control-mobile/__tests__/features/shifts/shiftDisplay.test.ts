import {
  getShiftDifferenceRows,
  getShiftDisplayStatus,
  getShiftIncidentSummary,
} from "@/src/features/shifts/shiftDisplay";
import type { Shift } from "@/src/types/api";

function shiftFixture(overrides: Partial<Shift> = {}): Shift {
  return {
    id: "shift-1",
    staffId: "staff-1",
    staffName: "Sara Staff",
    storeId: "store-1",
    storeName: "Kings Yard Baixa",
    type: "DAY",
    status: "OPEN",
    openedAt: "2026-07-06T08:00:00Z",
    closedAt: null,
    closedById: null,
    closureStatus: null,
    cashDifference: null,
    mbDifference: null,
    openIncidentCount: 0,
    totalIncidentCount: 0,
    ...overrides,
  };
}

describe("shiftDisplay", () => {
  it("returns OPEN for an open shift", () => {
    const shift = shiftFixture();

    expect(getShiftDisplayStatus(shift)).toEqual({
      label: "OPEN",
      variant: "open",
    });

    expect(getShiftDifferenceRows(shift)).toEqual([]);
    expect(getShiftIncidentSummary(shift)).toBeNull();
  });

  it("returns CLOSED OK for a closed shift without differences", () => {
    const shift = shiftFixture({
      status: "CLOSED",
      closedAt: "2026-07-06T17:00:00Z",
      closedById: "staff-1",
      closureStatus: "CLOSED_OK",
      cashDifference: 0,
      mbDifference: 0,
      openIncidentCount: 0,
      totalIncidentCount: 0,
    });

    expect(getShiftDisplayStatus(shift)).toEqual({
      label: "CLOSED OK",
      variant: "closedOk",
    });

    expect(getShiftDifferenceRows(shift)).toEqual([]);
    expect(getShiftIncidentSummary(shift)).toBeNull();
  });

  it("returns WITH INCIDENT and visible differences for a problematic closure", () => {
    const shift = shiftFixture({
      status: "CLOSED",
      closedAt: "2026-07-06T17:00:00Z",
      closedById: "staff-1",
      closureStatus: "CLOSED_WITH_INCIDENT",
      cashDifference: 4,
      mbDifference: -3.5,
      openIncidentCount: 2,
      totalIncidentCount: 2,
    });

    expect(getShiftDisplayStatus(shift)).toEqual({
      label: "WITH INCIDENT",
      variant: "withIncident",
    });

    expect(getShiftDifferenceRows(shift)).toEqual([
      {
        label: "Cash difference",
        value: "+€4.00",
      },
      {
        label: "MB difference",
        value: "-€3.50",
      },
    ]);

    expect(getShiftIncidentSummary(shift)).toBe("2 open incidents");
  });

  it("shows resolved incident summary when no incidents remain open", () => {
    const shift = shiftFixture({
      status: "CLOSED",
      closedAt: "2026-07-06T17:00:00Z",
      closedById: "staff-1",
      closureStatus: "CLOSED_WITH_INCIDENT",
      cashDifference: 4,
      mbDifference: 0,
      openIncidentCount: 0,
      totalIncidentCount: 1,
    });

    expect(getShiftIncidentSummary(shift)).toBe(
      "0 open incidents · 1 total incident"
    );
  });
});