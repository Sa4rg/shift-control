import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import {
  getCurrentShift,
  openShift,
  type CurrentShiftResult,
} from "@/src/api/shifts";
import { useAuth } from "@/src/auth/AuthContext";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import type { ShiftType } from "@/src/types/api";

type ShiftLoadState =
  | {
      status: "loading";
      result: null;
      errorMessage: null;
    }
  | {
      status: "ready";
      result: CurrentShiftResult;
      errorMessage: null;
    }
  | {
      status: "error";
      result: null;
      errorMessage: string;
    };

export default function StaffHomeScreen() {
  const { user, logout } = useAuth();

  const [shiftState, setShiftState] = useState<ShiftLoadState>({
    status: "loading",
    result: null,
    errorMessage: null,
  });
  const [openingShiftType, setOpeningShiftType] = useState<ShiftType | null>(
    null
  );
  const [openShiftErrorMessage, setOpenShiftErrorMessage] = useState<
    string | null
  >(null);

  const loadCurrentShift = useCallback(async () => {
    setShiftState({
      status: "loading",
      result: null,
      errorMessage: null,
    });

    try {
      const result = await getCurrentShift();

      setShiftState({
        status: "ready",
        result,
        errorMessage: null,
      });
    } catch (error) {
      setShiftState({
        status: "error",
        result: null,
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, []);

  useEffect(() => {
    void loadCurrentShift();
  }, [loadCurrentShift]);

  async function handleOpenShift(type: ShiftType) {
    if (openingShiftType) {
      return;
    }

    setOpeningShiftType(type);
    setOpenShiftErrorMessage(null);

    try {
      await openShift({ type });
      await loadCurrentShift();
    } catch (error) {
      setOpenShiftErrorMessage(getApiErrorMessage(error));
    } finally {
      setOpeningShiftType(null);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/");
  }

  if (shiftState.status === "loading") {
    return <LoadingState message="Checking current shift..." />;
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Staff home</Text>
          <Text style={styles.subtitle}>Welcome, {user?.fullName}</Text>
        </View>

        {shiftState.status === "error" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Could not load current shift</Text>
            <ErrorMessage message={shiftState.errorMessage} />
            <Button title="Try again" onPress={loadCurrentShift} />
          </View>
        ) : null}

        {shiftState.status === "ready" &&
        shiftState.result.status === "none" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No active shift</Text>
            <Text style={styles.body}>
              You do not have an open shift right now.
            </Text>

            <ErrorMessage message={openShiftErrorMessage} />

            <View style={styles.actions}>
              <Button
                title="Open day shift"
                onPress={() => void handleOpenShift("DAY")}
                loading={openingShiftType === "DAY"}
                disabled={openingShiftType !== null}
              />
              <Button
                title="Open night shift"
                onPress={() => void handleOpenShift("NIGHT")}
                loading={openingShiftType === "NIGHT"}
                disabled={openingShiftType !== null}
              />
            </View>
          </View>
        ) : null}

        {shiftState.status === "ready" &&
        shiftState.result.status === "active" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Active shift</Text>
            <Text style={styles.body}>
              Type: {shiftState.result.shift.type}
            </Text>
            <Text style={styles.body}>
              Status: {shiftState.result.shift.status}
            </Text>
            <Text style={styles.body}>
              Opened at: {shiftState.result.shift.openedAt}
            </Text>

            <Pressable onPress={loadCurrentShift}>
              <Text style={styles.refreshLink}>Refresh</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Button title="Logout" onPress={handleLogout} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 18,
    color: "#555555",
  },
  card: {
    gap: 12,
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  actions: {
    gap: 12,
    marginTop: 4,
  },
  refreshLink: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  footer: {
    marginTop: "auto",
  },
});