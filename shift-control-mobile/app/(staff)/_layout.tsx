import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/src/auth/AuthContext";
import { LoadingState } from "@/src/components/LoadingState";

export default function StaffLayout() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return <LoadingState message="Checking session..." />;
  }

  if (status === "unauthenticated") {
    return <Redirect href="/(auth)/staff-login" />;
  }

  if (user?.role !== "STAFF") {
    return <Redirect href="/(admin)/dashboard" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}