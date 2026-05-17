import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { listIncidents } from "@/src/api/incidents";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import type { Incident } from "@/src/types/api";
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

export default function IncidentsIndexScreen() {
  const params = useLocalSearchParams<{ shiftId?: string }>();
  const shiftId = params.shiftId;
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
      const incidents = await listIncidents();

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
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadIncidents();
    }, [loadIncidents])
  );

  if (state.status === "loading") {
    return <LoadingState message="Loading incidents..." />;
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My incidents</Text>
          <Text style={styles.subtitle}>
            Incidents reported by you or related to your operational context.
          </Text>
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
            <Text style={styles.cardTitle}>No incidents</Text>
            <Text style={styles.body}>
              You have no incidents registered yet.
            </Text>
          </View>
        ) : null}

        {state.status === "ready" && state.incidents.length > 0 ? (
          <View style={styles.card}>
            {state.incidents.map((incident) => (
            <Pressable
                key={incident.id}
                style={styles.incidentRow}
                onPress={() => router.push(`/(staff)/incidents/${incident.id}`)}
            >
                <View style={styles.incidentMain}>
                <Text style={styles.incidentTitle}>{incident.title}</Text>
                <Text style={styles.incidentMeta}>
                    {incident.type} · {incident.severity} · {incident.status}
                </Text>
                <Text style={styles.incidentMeta}>
                    {formatDateTime(incident.createdAt)}
                </Text>
                </View>
            </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          {shiftId ? (
            <Button
              title="New incident"
              onPress={() =>
                router.push({
                  pathname: "/(staff)/incidents/new-incident" as never,
                  params: { shiftId },
                })
              }
            />
          ) : (
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                To create an incident, open a shift first or create it from a sale or closure context.
              </Text>
            </View>
          )}
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
  incidentRow: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  incidentMain: {
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
  infoCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#cfe0ff",
    borderRadius: 16,
    padding: 20,
    backgroundColor: "#f1f6ff",
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1f4f8f",
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
});