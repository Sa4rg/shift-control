import type { DiscountReason } from "@/src/types/api";

export type DiscountSelection = "NONE" | DiscountReason;
export type PaymentMode = "SINGLE" | "SPLIT";
export type SplitPaymentVariant = "REGISTER_METHODS" | "GLOVO_ONLINE_ONLY";
