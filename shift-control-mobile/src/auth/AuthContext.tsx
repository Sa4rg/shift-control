import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  adminLogin,
  getCurrentUser,
  staffLogin,
  type AdminLoginRequest,
  type StaffLoginRequest,
} from "@/src/api/auth";
import {
  clearAccessToken,
  getAccessToken,
  saveAccessToken,
} from "@/src/storage/token";
import type { AuthUser } from "@/src/types/api";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  restoreSession: () => Promise<void>;
  loginStaff: (request: StaffLoginRequest) => Promise<void>;
  loginAdmin: (request: AdminLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const restoreSession = useCallback(async () => {
    setStatus("loading");

    const accessToken = await getAccessToken();

    if (!accessToken) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setStatus("authenticated");
    } catch {
      await clearAccessToken();
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const loginStaff = useCallback(async (request: StaffLoginRequest) => {
    const response = await staffLogin(request);

    await saveAccessToken(response.accessToken);
    setUser(response.user);
    setStatus("authenticated");
  }, []);

  const loginAdmin = useCallback(async (request: AdminLoginRequest) => {
    const response = await adminLogin(request);

    await saveAccessToken(response.accessToken);
    setUser(response.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    await clearAccessToken();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      restoreSession,
      loginStaff,
      loginAdmin,
      logout,
    }),
    [status, user, restoreSession, loginStaff, loginAdmin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}