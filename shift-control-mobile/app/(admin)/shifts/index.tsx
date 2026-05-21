import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { listShifts, type ListShiftsParams } from "@/src/api/shifts";
import { listStores } from "@/src/api/stores";
import { listUsers } from "@/src/api/users";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import { TextField } from "@/src/components/TextField";
import type { AdminUser, Shift, ShiftStatus, Store } from "@/src/types/api";
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

type ReferenceDataState =
  | {
      status: "loading";
      stores: Store[];
      staffUsers: AdminUser[];
      errorMessage: null;
    }
  | {
      status: "ready";
      stores: Store[];
      staffUsers: AdminUser[];
      errorMessage: null;
    }
  | {
      status: "error";
      stores: Store[];
      staffUsers: AdminUser[];
      errorMessage: string;
    };

type ShiftStatusFilter = "ALL" | ShiftStatus;

const STATUS_FILTERS: ShiftStatusFilter[] = ["ALL", "OPEN", "CLOSED"];

function isValidOptionalIsoDate(value: string): boolean {
  if (value.trim().length === 0) {
    return true;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime());
}

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
  const [referenceDataState, setReferenceDataState] =
    useState<ReferenceDataState>({
      status: "loading",
      stores: [],
      staffUsers: [],
      errorMessage: null,
    });

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ShiftStatusFilter>("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [state, setState] = useState<ShiftsState>({
    status: "loading",
    shifts: [],
    errorMessage: null,
  });

  const canLoadShifts =
    isValidOptionalIsoDate(fromDate) && isValidOptionalIsoDate(toDate);

  const activeStores = useMemo(
    () =>
      referenceDataState.status === "ready"
        ? referenceDataState.stores.filter((store) => store.active)
        : [],
    [referenceDataState]
  );

  const activeStaffUsers = useMemo(
    () =>
      referenceDataState.status === "ready"
        ? referenceDataState.staffUsers.filter(
            (user) => user.active && user.role === "STAFF"
          )
        : [],
    [referenceDataState]
  );

  const staffOptions = useMemo(() => {
    if (!selectedStoreId) {
      return activeStaffUsers;
    }

    return activeStaffUsers.filter((user) => user.storeId === selectedStoreId);
  }, [activeStaffUsers, selectedStoreId]);

  const selectedStore = useMemo(
    () => activeStores.find((store) => store.id === selectedStoreId) ?? null,
    [activeStores, selectedStoreId]
  );

  const selectedStaff = useMemo(
    () => staffOptions.find((user) => user.id === selectedStaffId) ?? null,
    [staffOptions, selectedStaffId]
  );

  const loadReferenceData = useCallback(async () => {
    setReferenceDataState({
      status: "loading",
      stores: [],
      staffUsers: [],
      errorMessage: null,
    });

    try {
      const [stores, staffUsers] = await Promise.all([
        listStores(),
        listUsers({ role: "STAFF" }),
      ]);

      setReferenceDataState({
        status: "ready",
        stores,
        staffUsers,
        errorMessage: null,
      });
    } catch (error) {
      setReferenceDataState({
        status: "error",
        stores: [],
        staffUsers: [],
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, []);

  const loadShifts = useCallback(async () => {
    if (!canLoadShifts) {
      return;
    }

    setState({
      status: "loading",
      shifts: [],
      errorMessage: null,
    });

    const params: ListShiftsParams = {
      storeId: selectedStoreId ?? undefined,
      staffId: selectedStaffId ?? undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      from: fromDate.trim().length > 0 ? fromDate.trim() : undefined,
      to: toDate.trim().length > 0 ? toDate.trim() : undefined,
    };

    try {
      const shifts = await listShifts(params);

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
  }, [
    canLoadShifts,
    selectedStoreId,
    selectedStaffId,
    statusFilter,
    fromDate,
    toDate,
  ]);

  useFocusEffect(
    useCallback(() => {
      void loadReferenceData();
      void loadShifts();
    }, [loadReferenceData, loadShifts])
  );

  function handleSelectStore(storeId: string | null) {
    setSelectedStoreId(storeId);
    setSelectedStaffId(null);
  }

  function handleClearFilters() {
    setSelectedStoreId(null);
    setSelectedStaffId(null);
    setStatusFilter("ALL");
    setFromDate("");
    setToDate("");
  }

  if (referenceDataState.status === "loading" || state.status === "loading") {
    return <LoadingState message="Loading shifts..." />;
  }

  const openCount =
    state.status === "ready"
      ? state.shifts.filter((shift) => shift.status === "OPEN").length
      : 0;

  const closedCount =
    state.status === "ready"
      ? state.shifts.filter((shift) => shift.status === "CLOSED").length
      : 0;

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Shifts</Text>
            <Text style={styles.subtitle}>
              Review all staff shifts across stores.
            </Text>
          </View>

          {referenceDataState.status === "error" ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Could not load filters</Text>
              <ErrorMessage message={referenceDataState.errorMessage} />
              <Button title="Try again" onPress={loadReferenceData} />
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Filters</Text>

            <Text style={styles.label}>Status</Text>
            <View style={styles.options}>
              {STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter}
                  title={filter === statusFilter ? `✓ ${filter}` : filter}
                  onPress={() => setStatusFilter(filter)}
                />
              ))}
            </View>

            {referenceDataState.status === "ready" ? (
              <>
                <Text style={styles.label}>Store</Text>
                <View style={styles.options}>
                  <Button
                    title={selectedStoreId === null ? "✓ All stores" : "All stores"}
                    onPress={() => handleSelectStore(null)}
                  />

                  {activeStores.map((store) => (
                    <Button
                      key={store.id}
                      title={
                        store.id === selectedStoreId
                          ? `✓ ${store.name}`
                          : store.name
                      }
                      onPress={() => handleSelectStore(store.id)}
                    />
                  ))}
                </View>

                {selectedStore ? (
                  <Text style={styles.helpText}>
                    Selected store: {selectedStore.name}
                  </Text>
                ) : null}

                <Text style={styles.label}>Staff</Text>
                <View style={styles.options}>
                  <Button
                    title={selectedStaffId === null ? "✓ All staff" : "All staff"}
                    onPress={() => setSelectedStaffId(null)}
                  />

                  {staffOptions.map((staff) => (
                    <Button
                      key={staff.id}
                      title={
                        staff.id === selectedStaffId
                          ? `✓ ${staff.fullName}`
                          : staff.fullName
                      }
                      onPress={() => setSelectedStaffId(staff.id)}
                    />
                  ))}
                </View>

                {selectedStaff ? (
                  <Text style={styles.helpText}>
                    Selected staff: {selectedStaff.fullName}
                  </Text>
                ) : null}
              </>
            ) : null}

            <TextField
              label="From"
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />

            {fromDate.length > 0 && !isValidOptionalIsoDate(fromDate) ? (
              <Text style={styles.helpText}>
                From date must use YYYY-MM-DD format.
              </Text>
            ) : null}

            <TextField
              label="To"
              value={toDate}
              onChangeText={setToDate}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />

            {toDate.length > 0 && !isValidOptionalIsoDate(toDate) ? (
              <Text style={styles.helpText}>
                To date must use YYYY-MM-DD format.
              </Text>
            ) : null}

            <View style={styles.filterActions}>
              <Button
                title="Apply filters"
                onPress={loadShifts}
                disabled={!canLoadShifts}
              />
              <Button title="Clear filters" onPress={handleClearFilters} />
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

          {state.status === "ready" && state.shifts.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No shifts found</Text>
              <Text style={styles.body}>
                There are no shifts for the selected filters.
              </Text>
            </View>
          ) : null}

          {state.status === "ready" && state.shifts.length > 0 ? (
            <View style={styles.card}>
              {state.shifts.map((shift) => (
                <ShiftRow key={shift.id} shift={shift} />
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button title="Refresh" onPress={loadShifts} />
            <Button title="Back" onPress={() => router.back()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
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
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333333",
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#555555",
  },
  options: {
    gap: 8,
  },
  filterActions: {
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