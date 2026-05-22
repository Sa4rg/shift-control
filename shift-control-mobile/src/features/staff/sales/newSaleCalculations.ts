import type { CreateSaleDiscountRequest } from "@/src/types/api";

import type { DiscountSelection } from "@/src/features/staff/sales/newSaleTypes";

export function parsePositiveNumber(value: string): number | null {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export type OptionalPositiveNumberParseResult = {
  amount: number | null;
  isValid: boolean;
};

export function parseOptionalPositiveNumber(
  value: string
): OptionalPositiveNumberParseResult {
  if (value.trim().length === 0) {
    return {
      amount: null,
      isValid: true,
    };
  }

  const parsed = parsePositiveNumber(value);

  return {
    amount: parsed,
    isValid: parsed !== null,
  };
}

export function parsePositiveInteger(value: string): number | null {
  const parsed = Number(value.trim());

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateDiscountAmount({
  subtotal,
  discount,
  manualDiscountAmount,
}: {
  subtotal: number | null;
  discount: DiscountSelection;
  manualDiscountAmount: number | null;
}): number | null {
  if (subtotal === null) {
    return null;
  }

  if (discount === "NONE") {
    return 0;
  }

  if (discount === "LOYALTY_CARD") {
    return subtotal >= 25 ? 20 : null;
  }

  if (discount === "VOUCHER_10_PERCENT") {
    return roundMoney(subtotal * 0.1);
  }

  if (manualDiscountAmount === null) {
    return null;
  }

  return manualDiscountAmount;
}

export function buildDiscounts({
  discount,
  manualDiscountAmount,
  manualDiscountNote,
}: {
  discount: DiscountSelection;
  manualDiscountAmount: number | null;
  manualDiscountNote: string;
}): CreateSaleDiscountRequest[] {
  if (discount === "NONE") {
    return [];
  }

  if (discount === "LOYALTY_CARD") {
    return [{ reason: "LOYALTY_CARD" }];
  }

  if (discount === "VOUCHER_10_PERCENT") {
    return [{ reason: "VOUCHER_10_PERCENT" }];
  }

  if (manualDiscountAmount === null) {
    return [];
  }

  return [
    {
      reason: "MANUAL_DISCOUNT",
      amount: manualDiscountAmount,
      note: manualDiscountNote.trim(),
    },
  ];
}
