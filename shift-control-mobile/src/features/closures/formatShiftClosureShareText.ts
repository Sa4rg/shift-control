import type {
  Shift,
  ShiftClosure,
  ShiftClosureStatus,
  ShiftType,
} from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { formatMoney } from "@/src/utils/money";

type ShiftClosureShareData = {
  shift: Shift;
  closure: ShiftClosure;
};

function formatShiftType(type: ShiftType): string {
  switch (type) {
    case "DAY":
      return "Day";
    case "NIGHT":
      return "Night";
  }
}

function formatClosureStatus(status: ShiftClosureStatus): string {
  switch (status) {
    case "CLOSED_OK":
      return "Closed successfully";
    case "CLOSED_WITH_INCIDENT":
      return "Closed with incident";
  }
}

function formatSignedMoney(value: number): string {
  if (value > 0) {
    return `+${formatMoney(value)}`;
  }

  if (value < 0) {
    return `-${formatMoney(Math.abs(value))}`;
  }

  return formatMoney(0);
}

export function formatShiftClosureShareText({
  shift,
  closure,
}: ShiftClosureShareData): string {
  const baseCashRemaining =
    closure.expectedPhysicalCash - closure.cashToWithdraw;

  const lines: string[] = [
    "SHIFT CLOSURE",
    "",
    `Store: ${shift.storeName}`,
    `Staff: ${shift.staffName}`,
    `Shift: ${formatShiftType(shift.type)}`,
    `Opened: ${formatDateTime(shift.openedAt)}`,
    `Closed: ${formatDateTime(shift.closedAt ?? closure.createdAt)}`,
    "",
    `Total sales: ${formatMoney(closure.totalSales)}`,
    `Cash: ${formatMoney(closure.totalCash)}`,
    `MB: ${formatMoney(closure.totalMb)}`,
    `Glovo online: ${formatMoney(closure.totalGlovoOnline)}`,
    `Glovo cash: ${formatMoney(closure.totalGlovoCash)}`,
  ];

  if (closure.pendingInvoiceTotal > 0) {
    lines.push(
      `Pending invoice: ${formatMoney(closure.pendingInvoiceTotal)}`
    );
  }

  lines.push(
    "",
    `Expected physical cash: ${formatMoney(
      closure.expectedPhysicalCash
    )}`,
    `Confirmed cash: ${formatMoney(closure.confirmedCashAmount)}`,
    `Cash difference: ${formatSignedMoney(closure.cashDifference)}`,
    "",
    `Expected MB: ${formatMoney(closure.totalMb)}`,
    `Confirmed MB: ${formatMoney(closure.confirmedMbAmount)}`,
    `MB difference: ${formatSignedMoney(closure.mbDifference)}`,
    "",
    `Cash to withdraw: ${formatMoney(closure.cashToWithdraw)}`,
    `Base cash remaining: ${formatMoney(baseCashRemaining)}`,
    "",
    `Status: ${formatClosureStatus(closure.status)}`
  );

  if (closure.note) {
    lines.push(`Note: ${closure.note}`);
  }

  return lines.join("\n");
}
