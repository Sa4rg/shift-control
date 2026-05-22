import type { PaymentMethod } from "@/src/types/api";

import type { DiscountSelection } from "@/src/features/staff/sales/newSaleTypes";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "MB",
  "GLOVO_ONLINE",
  "GLOVO_CASH",
];

export const SPLIT_REGISTER_METHODS: PaymentMethod[] = [
  "CASH",
  "MB",
  "GLOVO_CASH",
];

export const DISCOUNT_OPTIONS: DiscountSelection[] = [
  "NONE",
  "LOYALTY_CARD",
  "VOUCHER_10_PERCENT",
  "MANUAL_DISCOUNT",
];

export const PAYMENT_METHOD_HELP: Record<PaymentMethod, string> = {
  CASH: "Cash received directly in the register.",
  MB: "Card terminal payment.",
  GLOVO_ONLINE:
    "Glovo order already paid through the Glovo platform. It does not affect physical cash or MB terminal totals.",
  GLOVO_CASH:
    "Glovo order paid in cash to staff. It affects physical cash and Glovo totals.",
};

export const DISCOUNT_HELP: Record<DiscountSelection, string> = {
  NONE: "No discount will be applied.",
  LOYALTY_CARD:
    "Applies a fixed €20.00 discount. Requires subtotal of at least €25.00.",
  VOUCHER_10_PERCENT:
    "Applies a 10% discount over the original subtotal.",
  MANUAL_DISCOUNT:
    "Applies a custom fixed amount. Requires amount and approval note.",
};

export function getDiscountLabel(discount: DiscountSelection): string {
  switch (discount) {
    case "NONE":
      return "No discount";
    case "LOYALTY_CARD":
      return "Loyalty card";
    case "VOUCHER_10_PERCENT":
      return "Voucher 10%";
    case "MANUAL_DISCOUNT":
      return "Manual discount";
  }
}
