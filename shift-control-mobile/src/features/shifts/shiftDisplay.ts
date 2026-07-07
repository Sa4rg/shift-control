import type { Shift } from "@/src/types/api";

export type ShiftDisplayStatusVariant =
  | "open"
  | "closedOk"
  | "withIncident";

export type ShiftDisplayStatus = {
  label: string;
  variant: ShiftDisplayStatusVariant;
};

export type ShiftDifferenceRow = {
  label: string;
  value: string;
};

function formatSignedMoney(value: number): string {
  const sign = value > 0 ? "+" : "-";
  const absoluteValue = Math.abs(value);

  return `${sign}€${absoluteValue.toFixed(2)}`;
}

function formatIncidentWord(count: number): string {
  return count === 1 ? "incident" : "incidents";
}

export function getShiftDisplayStatus(shift: Shift): ShiftDisplayStatus {
  if (shift.status === "OPEN") {
    return {
      label: "OPEN",
      variant: "open",
    };
  }

  if (shift.closureStatus === "CLOSED_WITH_INCIDENT") {
    return {
      label: "WITH INCIDENT",
      variant: "withIncident",
    };
  }

  return {
    label: "CLOSED OK",
    variant: "closedOk",
  };
}

export function getShiftDifferenceRows(shift: Shift): ShiftDifferenceRow[] {
  const rows: ShiftDifferenceRow[] = [];

  if (shift.cashDifference !== null && shift.cashDifference !== 0) {
    rows.push({
      label: "Cash difference",
      value: formatSignedMoney(shift.cashDifference),
    });
  }

  if (shift.mbDifference !== null && shift.mbDifference !== 0) {
    rows.push({
      label: "MB difference",
      value: formatSignedMoney(shift.mbDifference),
    });
  }

  return rows;
}

export function getShiftIncidentSummary(shift: Shift): string | null {
  if (shift.totalIncidentCount <= 0) {
    return null;
  }

  if (shift.openIncidentCount === shift.totalIncidentCount) {
    return `${shift.openIncidentCount} open ${formatIncidentWord(
      shift.openIncidentCount
    )}`;
  }

  return `${shift.openIncidentCount} open ${formatIncidentWord(
    shift.openIncidentCount
  )} · ${shift.totalIncidentCount} total ${formatIncidentWord(
    shift.totalIncidentCount
  )}`;
}