import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { listShifts } from "@/src/api/shifts";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import type { Shift, ShiftStatus } from "@/src/types/api";
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

type ShiftStatusFilter = "ALL" | ShiftStatus;

const STATUS_FILTERS: ShiftStatusFilter[] = ["ALL", "OPEN", "CLOSED"];

function ShiftRow({ shift }: { shift: Shift }) {
  return (
    <Pressable
      style={styles.shiftRow}
      onPress={() => router.push(`/(admin)/shifts/${shift.id}`)}
    >
      <View style={styles.shiftMain}>
        <Text style={styles.shiftTitle}>
          {shift.type} shift · {shift.status}
        </Text>
        <Text style={styles.shiftMeta}>{shift.storeName}</Text>
        <Text style={styles.shiftMeta}>Staff: {shift.staffName}</Text>
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

export default function AdminShiftsScreen() {
  const [statusFilter, setStatusFilter] = useState<ShiftStatusFilter>("ALL");
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

  const filteredShifts = useMemo(() => {
    if (state.status !== "ready") {
      return [];
    }

    if (statusFilter === "ALL") {
      return state.shifts;
    }

    return state.shifts.filter((shift) => shift.status === statusFilter);
  }, [state, statusFilter]);

  const openCount = useMemo(
    () =>
      state.status === "ready"
        ? state.shifts.filter((shift) => shift.status === "OPEN").length
        : 0,
    [state]
  );

  const closedCount = useMemo(
    () =>
      state.status === "ready"
        ? state.shifts.filter((shift) => shift.status === "CLOSED").length
        : 0,
    [state]
  );

  if (state.status === "loading") {
    return <LoadingState message="Loading shifts..." />;
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Shifts</Text>
          <Text style={styles.subtitle}>
            Review all staff shifts across stores.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Filter</Text>

          <View style={styles.options}>
            {STATUS_FILTERS.map((filter) => (
              <Button
                key={filter}
                title={filter === statusFilter ? `✓ ${filter}` : filter}
                onPress={() => setStatusFilter(filter)}
              />
            ))}
          </View>

          {state.status === "ready" ? (
            <Text style={styles.body}>
              Open: {openCount} · Closed: {closedCount}
            </Text>
          ) : null}
        </View>

        {state.status === "error" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Could not load shifts</Text>
            <ErrorMessage message={state.errorMessage} />
            <Button title="Try again" onPress={loadShifts} />
          </View>
        ) : null}

        {state.status === "ready" && filteredShifts.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No shifts found</Text>
            <Text style={styles.body}>
              There are no shifts for the selected filter.
            </Text>
          </View>
        ) : null}

        {state.status === "ready" && filteredShifts.length > 0 ? (
          <View style={styles.card}>
            {filteredShifts.map((shift) => (
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
  options: {
    gap: 8,
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