import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/src/auth/AuthContext";
import { LoadingState } from "@/src/components/LoadingState";

export default function AdminLayout() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return <LoadingState message="Checking session..." />;
  }

  if (status === "unauthenticated") {
    return <Redirect href="/(auth)/admin-login" />;
  }

  if (user?.role !== "ADMIN") {
    return <Redirect href="/(staff)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}