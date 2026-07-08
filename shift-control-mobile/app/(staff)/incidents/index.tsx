import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { listIncidents } from "@/src/api/incidents";
import { getCurrentShift } from "@/src/api/shifts";
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { colors, commonStyles, fontWeight, fontSize, radius } from "@/src/theme";
import { LoadingState } from "@/src/components/LoadingState";
import type { Incident, IncidentSeverity, IncidentStatus } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";

function formatIncidentType(type: string): string {
  return type.replace(/_/g, " ");
}

function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const configs: Record<IncidentSeverity, { bg: string; color: string }> = {
    LOW: { bg: "#e8ecf0", color: "#4d5b5a" },
    MEDIUM: { bg: "#fff3d6", color: colors.warning },
    HIGH: { bg: "#ffdad6", color: "#93000a" },
  };
  const { bg, color } = configs[severity];
  return (
    <Text style={[styles.badge, { backgroundColor: bg, color }]}>
      {severity}
    </Text>
  );
}

function StatusBadge({ status }: { status: IncidentStatus }) {
  const configs: Record<IncidentStatus, { bg: string; color: string }> = {
    OPEN: { bg: "#e8eeff", color: colors.secondary },
    RESOLVED: { bg: "#d2f5f0", color: "#004f49" },
  };
  const { bg, color } = configs[status];
  return (
    <Text style={[styles.badge, { backgroundColor: bg, color }]}>
      {status}
    </Text>
  );
}

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
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  // Prefer an explicit shiftId param (sale/closure context); fall back to active shift
  const effectiveShiftId = params.shiftId ?? activeShiftId;
  const [state, setState] = useState<IncidentsState>({
    status: "loading",
    incidents: [],
    errorMessage: null,
  });

  const loadActiveShift = useCallback(async () => {
    try {
      const result = await getCurrentShift();
      setActiveShiftId(result.status === "active" ? result.shift.id : null);
    } catch {
      // Non-blocking — incidents list still works without active shift
      setActiveShiftId(null);
    }
  }, []);

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
      void loadActiveShift();
    }, [loadIncidents, loadActiveShift])
  );

  if (state.status === "loading") {
    return <LoadingState message="Loading incidents..." />;
  }

  const newIncidentPath = "/(staff)/incidents/new-incident" as never;

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <AppTopBar variant="back" />

      <ScrollView
        contentContainerStyle={commonStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page header */}
        <View style={commonStyles.pageHeader}>
          <Text style={commonStyles.pageTitle}>My incidents</Text>
          <Text style={commonStyles.pageSubtitle}>
            Incidents reported by you or related to your operational context.
          </Text>
        </View>

        {/* Error state */}
        {state.status === "error" ? (
          <View style={commonStyles.card}>
            <Text style={commonStyles.cardTitle}>Could not load incidents</Text>
            <ErrorMessage message={state.errorMessage} />
            <Pressable style={commonStyles.outlineButton} onPress={loadIncidents}>
              <Text style={commonStyles.outlineButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Empty state */}
        {state.status === "ready" && state.incidents.length === 0 ? (
          <View style={commonStyles.card}>
            <Text style={commonStyles.cardTitle}>No incidents yet</Text>
            <Text style={styles.emptyBody}>
              You have not reported any incidents.
            </Text>
            {effectiveShiftId ? (
              <Pressable
                style={commonStyles.primaryButton}
                onPress={() =>
                  router.push({
                    pathname: newIncidentPath,
                    params: { shiftId: effectiveShiftId },
                  })
                }
              >
                <Text style={commonStyles.primaryButtonText}>+ New incident</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Incidents list */}
        {state.status === "ready" && state.incidents.length > 0 ? (
          <View style={commonStyles.listCard}>
            {state.incidents.map((incident, index) => (
              <View key={incident.id}>
                {index > 0 && <View style={styles.rowDivider} />}
                <Pressable
                  style={({ pressed }) => [
                    styles.incidentRow,
                    pressed && styles.incidentRowPressed,
                  ]}
                  onPress={() =>
                    router.push(`/(staff)/incidents/${incident.id}` as never)
                  }
                >
                  <View style={styles.incidentTop}>
                    <Text style={styles.incidentTitle} numberOfLines={2}>
                      {incident.title || formatIncidentType(incident.type)}
                    </Text>
                    <Text style={styles.incidentDate}>
                      {formatDateTime(incident.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.badgeRow}>
                    <Text style={styles.typeBadge}>
                      {formatIncidentType(incident.type)}
                    </Text>
                    <SeverityBadge severity={incident.severity} />
                    <StatusBadge status={incident.status} />
                  </View>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {/* Actions */}
        <View style={commonStyles.actions}>
          {effectiveShiftId ? (
            <Pressable
              style={({ pressed }) => [
                commonStyles.primaryButton,
                pressed && styles.btnPressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: newIncidentPath,
                  params: { shiftId: effectiveShiftId },
                })
              }
            >
              <Text style={commonStyles.primaryButtonText}>+ New incident</Text>
            </Pressable>
          ) : (
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                To create an incident, open a shift first or create it from a
                sale or closure context.
              </Text>
            </View>
          )}
          <Pressable
            style={({ pressed }) => [
              commonStyles.btnBack,
              pressed && styles.btnPressed,
            ]}
            onPress={() => router.back()}
          >
            <Text style={commonStyles.btnBackText}>Back</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyBody: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    lineHeight: 21,
  },

  // Incidents list card
  rowDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginHorizontal: 16,
  },

  // Incident row
  incidentRow: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 12,
  },
  incidentRowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  incidentTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  incidentTitle: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 20,
  },
  incidentDate: {
    fontSize: fontSize.sm,
    color: colors.textSubtle,
    flexShrink: 0,
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  // Badges
  badge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: "hidden",
    letterSpacing: 0.5,
  },
  typeBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: "hidden",
    backgroundColor: "#e2e7ff",
    color: colors.text,
    letterSpacing: 0.5,
  },

  // Info card (no shiftId)
  infoCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    padding: 16,
  },
  infoText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    lineHeight: 22,
  },

  // Action buttons
  btnPressed: {
    opacity: 0.8,
  },
});

