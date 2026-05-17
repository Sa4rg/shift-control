export type UserRole = "STAFF" | "ADMIN";

export type AuthUser = {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  storeId: string | null;
};

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: AuthUser;
};

export type ShiftType = "DAY" | "NIGHT";

export type ShiftStatus = "OPEN" | "CLOSED";

export type Shift = {
  id: string;
  staffId: string;
  storeId: string;
  type: ShiftType;
  status: ShiftStatus;
  openedAt: string;
  closedAt: string | null;
  closedById: string | null;
};

export type SaleStatus = "ACTIVE" | "CANCELLED";

export type InvoiceStatus = "PENDING" | "INVOICED";

export type PaymentMethod = "CASH" | "MB" | "GLOVO_ONLINE" | "GLOVO_CASH";

export type DiscountReason =
  | "MANUAL_DISCOUNT"
  | "LOYALTY_CARD"
  | "VOUCHER_10_PERCENT";

export type DiscountType = "FIXED_AMOUNT" | "PERCENTAGE";

export type SaleItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type SaleDiscount = {
  id: string;
  type: DiscountType;
  reason: DiscountReason;
  value: number;
  calculatedAmount: number;
  note: string | null;
};

export type SalePayment = {
  id: string;
  method: PaymentMethod;
  amount: number;
};

export type Sale = {
  id: string;
  shiftId: string;
  staffId: string;
  storeId: string;
  status: SaleStatus;
  invoiceStatus: InvoiceStatus;
  subtotalAmount: number;
  discountTotalAmount: number;
  finalTotalAmount: number;
  note: string | null;
  items: SaleItem[];
  discounts: SaleDiscount[];
  payments: SalePayment[];
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  cancelledReason: string | null;
};

export type CreateSaleItemRequest = {
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type CreateSalePaymentRequest = {
  method: PaymentMethod;
  amount: number;
};

export type CreateSaleDiscountRequest =
  | {
      reason: "LOYALTY_CARD";
    }
  | {
      reason: "VOUCHER_10_PERCENT";
    }
  | {
      reason: "MANUAL_DISCOUNT";
      amount: number;
      note: string;
    };

export type CreateSaleRequest = {
  items: CreateSaleItemRequest[];
  discounts: CreateSaleDiscountRequest[];
  payments: CreateSalePaymentRequest[];
  invoiceStatus: InvoiceStatus;
  note?: string;
};

export type ShiftClosePreview = {
  shiftId: string;
  staffId: string;
  staffName: string;
  storeId: string;
  storeName: string;
  totalCash: number;
  totalMb: number;
  totalGlovoOnline: number;
  totalGlovoCash: number;
  totalSales: number;
  pendingInvoiceTotal: number;
  cashToWithdraw: number;
  expectedPhysicalCash: number;
};

export type ShiftClosureStatus = "CLOSED_OK" | "CLOSED_WITH_INCIDENT";

export type CloseShiftRequest = {
  confirmedCashAmount: number;
  confirmedMbAmount: number;
  note?: string;
};

export type ShiftCloseResult = ShiftClosePreview & {
  confirmedCashAmount: number;
  confirmedMbAmount: number;
  cashDifference: number;
  mbDifference: number;
  closedById: string;
  status: ShiftClosureStatus;
};

export type IncidentType =
  | "CASH_DIFFERENCE"
  | "MB_DIFFERENCE"
  | "GLOVO_DIFFERENCE"
  | "WRONG_CHARGE"
  | "PENDING_INVOICE"
  | "OPERATIONAL_NOTE";

export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH";

export type IncidentStatus = "OPEN" | "RESOLVED";

export type Incident = {
  id: string;
  type: IncidentType;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  shiftId: string | null;
  closureId: string | null;
  saleId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
};

export type CreateIncidentRequest = {
  type: IncidentType;
  title: string;
  description: string;
  severity: IncidentSeverity;
  shiftId?: string;
  closureId?: string;
  saleId?: string;
};