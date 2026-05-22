import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/src/auth/AuthContext";
import { LoadingState } from "@/src/components/LoadingState";

export default function AuthLayout() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return <LoadingState message="Checking session..." />;
  }

  if (status === "authenticated" && user?.role === "STAFF") {
    return <Redirect href="/(staff)/home" />;
  }

  if (status === "authenticated" && user?.role === "ADMIN") {
    return <Redirect href="/(admin)/dashboard" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}