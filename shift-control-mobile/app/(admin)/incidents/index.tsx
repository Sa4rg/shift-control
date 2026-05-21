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
import { listIncidents, type ListIncidentsParams } from "@/src/api/incidents";
import { listStores } from "@/src/api/stores";
import { listUsers } from "@/src/api/users";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import type { AdminUser, Incident, IncidentStatus, Store } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";

type IncidentsState =
  | {
      status: "loading";
      incidents: Incident[];
      errorMessage: null;
    }
  | {
      status: "ready";
      incidents: Incident[];
      errorMessage: null;
    }
  | {
      status: "error";
      incidents: Incident[];
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

type IncidentStatusFilter = "ALL" | IncidentStatus;

const STATUS_FILTERS: IncidentStatusFilter[] = ["ALL", "OPEN", "RESOLVED"];

function IncidentRow({ incident }: { incident: Incident }) {
  return (
    <Pressable
      style={styles.incidentRow}
      onPress={() => router.push(`/(admin)/incidents/${incident.id}`)}
    >
      <View style={styles.incidentMain}>
        <Text style={styles.incidentTitle}>{incident.title}</Text>
        <Text style={styles.incidentMeta}>
          {incident.type} · {incident.severity} · {incident.status}
        </Text>
        <Text style={styles.incidentMeta}>
          Reported by {incident.reportedByName}
        </Text>
        <Text style={styles.incidentMeta}>
          {formatDateTime(incident.createdAt)}
        </Text>
      </View>

      <Text style={styles.incidentAction}>View</Text>
    </Pressable>
  );
}

export default function AdminIncidentsScreen() {
  const [referenceDataState, setReferenceDataState] =
    useState<ReferenceDataState>({
      status: "loading",
      stores: [],
      staffUsers: [],
      errorMessage: null,
    });

  const [statusFilter, setStatusFilter] = useState<IncidentStatusFilter>("ALL");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const [state, setState] = useState<IncidentsState>({
    status: "loading",
    incidents: [],
    errorMessage: null,
  });

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

  const loadIncidents = useCallback(async () => {
    setState({
      status: "loading",
      incidents: [],
      errorMessage: null,
    });

    const params: ListIncidentsParams = {
      status: statusFilter === "ALL" ? undefined : statusFilter,
      storeId: selectedStoreId ?? undefined,
      staffId: selectedStaffId ?? undefined,
    };

    try {
      const incidents = await listIncidents(params);

      setState({
        status: "ready",
        incidents,
        errorMessage: null,
      });
    } catch (error) {
      setState({
        status: "error",
        incidents: [],
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, [statusFilter, selectedStoreId, selectedStaffId]);

  useFocusEffect(
    useCallback(() => {
      void loadReferenceData();
      void loadIncidents();
    }, [loadReferenceData, loadIncidents])
  );

  function handleSelectStore(storeId: string | null) {
    setSelectedStoreId(storeId);
    setSelectedStaffId(null);
  }

  function handleClearFilters() {
    setStatusFilter("ALL");
    setSelectedStoreId(null);
    setSelectedStaffId(null);
  }

  if (referenceDataState.status === "loading" || state.status === "loading") {
    return <LoadingState message="Loading incidents..." />;
  }

  const openCount =
    state.status === "ready"
      ? state.incidents.filter((incident) => incident.status === "OPEN").length
      : 0;

  const resolvedCount =
    state.status === "ready"
      ? state.incidents.filter((incident) => incident.status === "RESOLVED")
          .length
      : 0;

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Incidents</Text>
            <Text style={styles.subtitle}>
              Review operational issues reported by staff.
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
                    title={
                      selectedStoreId === null ? "✓ All stores" : "All stores"
                    }
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
                    title={
                      selectedStaffId === null ? "✓ All staff" : "All staff"
                    }
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

            <View style={styles.filterActions}>
              <Button title="Apply filters" onPress={loadIncidents} />
              <Button title="Clear filters" onPress={handleClearFilters} />
            </View>

            {state.status === "ready" ? (
              <Text style={styles.body}>
                Open: {openCount} · Resolved: {resolvedCount}
              </Text>
            ) : null}
          </View>

          {state.status === "error" ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Could not load incidents</Text>
              <ErrorMessage message={state.errorMessage} />
              <Button title="Try again" onPress={loadIncidents} />
            </View>
          ) : null}

          {state.status === "ready" && state.incidents.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No incidents found</Text>
              <Text style={styles.body}>
                There are no incidents for the selected filters.
              </Text>
            </View>
          ) : null}

          {state.status === "ready" && state.incidents.length > 0 ? (
            <View style={styles.card}>
              {state.incidents.map((incident) => (
                <IncidentRow key={incident.id} incident={incident} />
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button title="Refresh" onPress={loadIncidents} />
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
  incidentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  incidentMain: {
    flex: 1,
    gap: 4,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  incidentMeta: {
    fontSize: 14,
    color: "#666666",
  },
  incidentAction: {
    fontSize: 14,
    fontWeight: "700",
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
});