import { Redirect } from "expo-router";

import { useAuth } from "@/src/auth/AuthContext";
import { LoadingState } from "@/src/components/LoadingState";

export default function IndexScreen() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return <LoadingState message="Restoring session..." />;
  }

  if (status === "unauthenticated") {
    return <Redirect href="/staff-login" />;
  }

  if (user?.role === "ADMIN") {
    return <Redirect href="/dashboard" />;
  }

  return <Redirect href="/home" />;
}