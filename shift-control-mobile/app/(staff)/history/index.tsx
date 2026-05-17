import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { listShifts } from "@/src/api/shifts";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import type { Shift } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";

type ShiftsState =
  | {
      status: "loading";
      shifts: Shift[];
      errorMessage: null;
    }
  | {
      status: "ready";
      shifts: Shift[];
      errorMessage: null;
    }
  | {
      status: "error";
      shifts: Shift[];
      errorMessage: string;
    };

function ShiftRow({ shift }: { shift: Shift }) {
  return (
    <Pressable
      style={styles.shiftRow}
      onPress={() => router.push(`/(staff)/history/${shift.id}` as never)}
    >
      <View style={styles.shiftMain}>
        <Text style={styles.shiftTitle}>
          {shift.type} shift · {shift.status}
        </Text>
        <Text style={styles.shiftMeta}>{shift.storeName}</Text>
        <Text style={styles.shiftMeta}>
          Opened: {formatDateTime(shift.openedAt)}
        </Text>
        {shift.closedAt ? (
          <Text style={styles.shiftMeta}>
            Closed: {formatDateTime(shift.closedAt)}
          </Text>
        ) : null}
      </View>

      <Text style={styles.shiftAction}>View</Text>
    </Pressable>
  );
}

export default function StaffHistoryScreen() {
  const [state, setState] = useState<ShiftsState>({
    status: "loading",
    shifts: [],
    errorMessage: null,
  });

  const loadShifts = useCallback(async () => {
    setState({
      status: "loading",
      shifts: [],
      errorMessage: null,
    });

    try {
      const shifts = await listShifts();

      setState({
        status: "ready",
        shifts,
        errorMessage: null,
      });
    } catch (error) {
      setState({
        status: "error",
        shifts: [],
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadShifts();
    }, [loadShifts])
  );

  const openShifts = useMemo(
    () =>
      state.status === "ready"
        ? state.shifts.filter((shift) => shift.status === "OPEN")
        : [],
    [state]
  );

  const closedShifts = useMemo(
    () =>
      state.status === "ready"
        ? state.shifts.filter((shift) => shift.status === "CLOSED")
        : [],
    [state]
  );

  if (state.status === "loading") {
    return <LoadingState message="Loading shifts..." />;
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My shifts</Text>
          <Text style={styles.subtitle}>
            Review your open and closed shift history.
          </Text>
        </View>

        {state.status === "error" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Could not load shifts</Text>
            <ErrorMessage message={state.errorMessage} />
            <Button title="Try again" onPress={loadShifts} />
          </View>
        ) : null}

        {state.status === "ready" && state.shifts.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No shifts yet</Text>
            <Text style={styles.body}>
              You do not have any shifts registered yet.
            </Text>
          </View>
        ) : null}

        {openShifts.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Open shifts</Text>
            {openShifts.map((shift) => (
              <ShiftRow key={shift.id} shift={shift} />
            ))}
          </View>
        ) : null}

        {closedShifts.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Closed shifts</Text>
            {closedShifts.map((shift) => (
              <ShiftRow key={shift.id} shift={shift} />
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button title="Refresh" onPress={loadShifts} />
          <Button title="Back" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    padding: 24,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    color: "#555555",
    lineHeight: 22,
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
  shiftRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  shiftMain: {
    flex: 1,
    gap: 4,
  },
  shiftTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  shiftMeta: {
    fontSize: 14,
    color: "#666666",
  },
  shiftAction: {
    fontSize: 14,
    fontWeight: "700",
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
});