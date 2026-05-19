import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { listIncidents } from "@/src/api/incidents";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import type { Incident, IncidentStatus } from "@/src/types/api";
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
  const [statusFilter, setStatusFilter] = useState<IncidentStatusFilter>("ALL");
  const [state, setState] = useState<IncidentsState>({
    status: "loading",
    incidents: [],
    errorMessage: null,
  });

  const loadIncidents = useCallback(async () => {
    setState({
      status: "loading",
      incidents: [],
      errorMessage: null,
    });

    try {
      const incidents = await listIncidents(
        statusFilter === "ALL" ? {} : { status: statusFilter }
      );

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
  }, [statusFilter]);

  useFocusEffect(
    useCallback(() => {
      void loadIncidents();
    }, [loadIncidents])
  );

  const openCount = useMemo(
    () =>
      state.status === "ready"
        ? state.incidents.filter((incident) => incident.status === "OPEN").length
        : 0,
    [state]
  );

  const resolvedCount = useMemo(
    () =>
      state.status === "ready"
        ? state.incidents.filter((incident) => incident.status === "RESOLVED")
            .length
        : 0,
    [state]
  );

  if (state.status === "loading") {
    return <LoadingState message="Loading incidents..." />;
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Incidents</Text>
          <Text style={styles.subtitle}>
            Review operational issues reported by staff.
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
              There are no incidents for the selected filter.
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