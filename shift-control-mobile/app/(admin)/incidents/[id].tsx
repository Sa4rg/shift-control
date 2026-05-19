import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { getIncidentById } from "@/src/api/incidents";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import type { Incident } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";

type IncidentDetailState =
  | {
      status: "loading";
      incident: null;
      errorMessage: null;
    }
  | {
      status: "ready";
      incident: Incident;
      errorMessage: null;
    }
  | {
      status: "error";
      incident: null;
      errorMessage: string;
    };

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function AdminIncidentDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const incidentId = params.id;

  const [state, setState] = useState<IncidentDetailState>({
    status: "loading",
    incident: null,
    errorMessage: null,
  });

  const loadIncident = useCallback(async () => {
    if (!incidentId) {
      setState({
        status: "error",
        incident: null,
        errorMessage: "Incident id is missing.",
      });
      return;
    }

    setState({
      status: "loading",
      incident: null,
      errorMessage: null,
    });

    try {
      const incident = await getIncidentById(incidentId);

      setState({
        status: "ready",
        incident,
        errorMessage: null,
      });
    } catch (error) {
      setState({
        status: "error",
        incident: null,
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, [incidentId]);

  useEffect(() => {
    void loadIncident();
  }, [loadIncident]);

  if (state.status === "loading") {
    return <LoadingState message="Loading incident..." />;
  }

  if (state.status === "error") {
    return (
      <Screen>
        <View style={styles.container}>
          <Text style={styles.title}>Incident detail</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Could not load incident</Text>
            <ErrorMessage message={state.errorMessage} />
            <Button title="Try again" onPress={loadIncident} />
            <Button title="Back" onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  const incident = state.incident;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Incident detail</Text>
          <Text style={styles.subtitle}>Incident {incident.id.slice(0, 8)}</Text>
        </View>

        <View
          style={
            incident.status === "RESOLVED"
              ? styles.successCard
              : styles.warningCard
          }
        >
          <Text
            style={
              incident.status === "RESOLVED"
                ? styles.successTitle
                : styles.warningTitle
            }
          >
            {incident.status === "RESOLVED" ? "Resolved" : "Open"}
          </Text>
          <Text
            style={
              incident.status === "RESOLVED"
                ? styles.successText
                : styles.warningText
            }
          >
            {incident.status === "RESOLVED"
              ? "This incident has been resolved."
              : "This incident is pending admin resolution."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{incident.title}</Text>
          <Text style={styles.description}>{incident.description}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>

          <DetailRow label="Type" value={incident.type} />
          <DetailRow label="Severity" value={incident.severity} />
          <DetailRow label="Status" value={incident.status} />
          <DetailRow label="Reported by" value={incident.reportedByName} />
          <DetailRow
            label="Created at"
            value={formatDateTime(incident.createdAt)}
          />
          <DetailRow
            label="Updated at"
            value={formatDateTime(incident.updatedAt)}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Related context</Text>

          {incident.shiftId || incident.closureId || incident.saleId ? (
            <>
              <DetailRow
                label="Shift"
                value={incident.shiftId ? incident.shiftId.slice(0, 8) : null}
              />
              <DetailRow
                label="Closure"
                value={
                  incident.closureId ? incident.closureId.slice(0, 8) : null
                }
              />
              <DetailRow
                label="Sale"
                value={incident.saleId ? incident.saleId.slice(0, 8) : null}
              />

              {incident.shiftId ? (
                <Button
                  title="View shift"
                  onPress={() =>
                    router.push(`/(staff)/history/${incident.shiftId}`)
                  }
                />
              ) : null}

              {incident.saleId ? (
                <Button
                  title="View sale"
                  onPress={() => router.push(`/(staff)/sales/${incident.saleId}`)}
                />
              ) : null}
            </>
          ) : (
            <Text style={styles.body}>No related context available.</Text>
          )}
        </View>

        {incident.resolutionNote ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resolution</Text>
            <Text style={styles.description}>{incident.resolutionNote}</Text>
            <DetailRow label="Resolved by" value={incident.resolvedByName} />
            <DetailRow
              label="Resolved at"
              value={
                incident.resolvedAt ? formatDateTime(incident.resolvedAt) : null
              }
            />
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button title="Refresh" onPress={loadIncident} />
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
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  detailLabel: {
    flex: 1,
    fontSize: 16,
    color: "#555555",
  },
  detailValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
  },
  successCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#9bd49b",
    borderRadius: 16,
    padding: 20,
    backgroundColor: "#edf9ed",
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f6b1f",
  },
  successText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1f6b1f",
  },
  warningCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#f0d28a",
    borderRadius: 16,
    padding: 20,
    backgroundColor: "#fff8e5",
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#7a5200",
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#7a5200",
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
});