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