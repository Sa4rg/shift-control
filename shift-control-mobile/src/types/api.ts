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