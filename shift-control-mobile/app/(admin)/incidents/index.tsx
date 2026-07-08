import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { listIncidents, type ListIncidentsParams } from "@/src/api/incidents";
import { listStores } from "@/src/api/stores";
import { listUsers } from "@/src/api/users";
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type {
  AdminUser,
  Incident,
  IncidentSeverity,
  IncidentStatus,
  Store,
} from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { colors, commonStyles, fontWeight, fontSize, radius } from "@/src/theme";

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

function formatIncidentText(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSeverityAccent(severity: IncidentSeverity): string {
  if (severity === "HIGH") {
    return "#ba1a1a";
  }

  if (severity === "MEDIUM") {
    return "#825100";
  }

  return "#00685f";
}

function getSeverityBorderColor(severity: IncidentSeverity): string {
  if (severity === "HIGH") {
    return "#ffb4ab";
  }

  if (severity === "MEDIUM") {
    return "#ffddb8";
  }

  return "#6bd8cb";
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.filterChip,
        selected && styles.filterChipActive,
        pressed && commonStyles.buttonPressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          selected && styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function StatusSegment({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.statusSegment,
        selected && styles.statusSegmentActive,
        pressed && commonStyles.buttonPressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.statusSegmentText,
          selected && styles.statusSegmentTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Badge({
  label,
  variant,
}: {
  label: string;
  variant: "type" | "severity" | "open" | "resolved";
}) {
  return (
    <View
      style={[
        styles.badge,
        variant === "type" && styles.badgeType,
        variant === "severity" && styles.badgeSeverity,
        variant === "open" && styles.badgeOpen,
        variant === "resolved" && styles.badgeResolved,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          variant === "type" && styles.badgeTextType,
          variant === "severity" && styles.badgeTextSeverity,
          variant === "open" && styles.badgeTextOpen,
          variant === "resolved" && styles.badgeTextResolved,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function IncidentRow({
  incident,
  isLast,
}: {
  incident: Incident;
  isLast: boolean;
}) {
  const severityAccent = getSeverityAccent(incident.severity);
  const severityBorderColor = getSeverityBorderColor(incident.severity);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.incidentRow,
        isLast && styles.incidentRowLast,
        { borderLeftColor: severityBorderColor },
        pressed && commonStyles.buttonPressed,
      ]}
      onPress={() => router.push(`/(admin)/incidents/${incident.id}`)}
    >
      <View style={styles.incidentTopRow}>
        <Text style={styles.incidentTitle}>{incident.title}</Text>
        <Text style={styles.incidentDate}>
          {formatDateTime(incident.createdAt)}
        </Text>
      </View>

      <View style={styles.badgesRow}>
        <Badge label={formatIncidentText(incident.type)} variant="type" />

        <View
          style={[
            styles.badge,
            styles.badgeSeverity,
            { backgroundColor: `${severityAccent}16` },
          ]}
        >
          <Text style={[styles.badgeText, { color: severityAccent }]}>
            {formatIncidentText(incident.severity)}
          </Text>
        </View>

        <Badge
          label={formatIncidentText(incident.status)}
          variant={incident.status === "RESOLVED" ? "resolved" : "open"}
        />
      </View>

      <Text style={styles.reportedBy}>
        ♙ Reported by {incident.reportedByName}
      </Text>
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
            (staffUser) => staffUser.active && staffUser.role === "STAFF"
          )
        : [],
    [referenceDataState]
  );

  const staffOptions = useMemo(() => {
    if (!selectedStoreId) {
      return activeStaffUsers;
    }

    return activeStaffUsers.filter(
      (staffUser) => staffUser.storeId === selectedStoreId
    );
  }, [activeStaffUsers, selectedStoreId]);

  const selectedStore = useMemo(
    () => activeStores.find((store) => store.id === selectedStoreId) ?? null,
    [activeStores, selectedStoreId]
  );

  const selectedStaff = useMemo(
    () =>
      staffOptions.find((staffUser) => staffUser.id === selectedStaffId) ?? null,
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

  const openCount =
    state.status === "ready"
      ? state.incidents.filter((incident) => incident.status === "OPEN").length
      : 0;

  const resolvedCount =
    state.status === "ready"
      ? state.incidents.filter((incident) => incident.status === "RESOLVED")
          .length
      : 0;

  if (referenceDataState.status === "loading" || state.status === "loading") {
    return <LoadingState message="Loading incidents..." />;
  }

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <AppTopBar variant="back" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={commonStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={commonStyles.pageHeader}>
            <Text style={commonStyles.pageTitle}>Incidents</Text>
            <Text style={commonStyles.pageSubtitle}>
              Review and manage all operational issues across stores.
            </Text>
          </View>

          {referenceDataState.status === "error" ? (
            <View style={commonStyles.card}>
              <View style={commonStyles.cardBody}>
                <Text style={commonStyles.sectionLabel}>Could not load filters</Text>
                <ErrorMessage message={referenceDataState.errorMessage} />

                <Pressable
                  style={({ pressed }) => [
                    commonStyles.outlineButton,
                    pressed && commonStyles.buttonPressed,
                  ]}
                  onPress={loadReferenceData}
                >
                  <Text style={commonStyles.outlineButtonText}>Try again</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.filterCard}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Store</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalChips}
              >
                <FilterChip
                  label="All"
                  selected={selectedStoreId === null}
                  onPress={() => handleSelectStore(null)}
                />

                {activeStores.map((store) => (
                  <FilterChip
                    key={store.id}
                    label={store.name}
                    selected={store.id === selectedStoreId}
                    onPress={() => handleSelectStore(store.id)}
                  />
                ))}
              </ScrollView>

              {selectedStore ? (
                <Text style={styles.helperText}>
                  Selected store: {selectedStore.name}
                </Text>
              ) : null}
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Staff</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalChips}
              >
                <FilterChip
                  label="All"
                  selected={selectedStaffId === null}
                  onPress={() => setSelectedStaffId(null)}
                />

                {staffOptions.map((staffUser) => (
                  <FilterChip
                    key={staffUser.id}
                    label={staffUser.fullName}
                    selected={staffUser.id === selectedStaffId}
                    onPress={() => setSelectedStaffId(staffUser.id)}
                  />
                ))}
              </ScrollView>

              {selectedStaff ? (
                <Text style={styles.helperText}>
                  Selected staff: {selectedStaff.fullName}
                </Text>
              ) : null}
            </View>

            <View style={styles.statusSegments}>
              {STATUS_FILTERS.map((filter) => (
                <StatusSegment
                  key={filter}
                  label={filter}
                  selected={filter === statusFilter}
                  onPress={() => setStatusFilter(filter)}
                />
              ))}
            </View>

            <View style={styles.filterActions}>
              <Pressable
                style={({ pressed }) => [
                  commonStyles.primaryButton,
                  pressed && commonStyles.buttonPressed,
                ]}
                onPress={loadIncidents}
              >
                <Text style={commonStyles.primaryButtonText}>⟳ Load incidents</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.btnClear,
                  pressed && commonStyles.buttonPressed,
                ]}
                onPress={handleClearFilters}
              >
                <Text style={styles.btnClearText}>Clear filters</Text>
              </Pressable>
            </View>

            {state.status === "ready" ? (
              <Text style={styles.resultSummary}>
                Open: {openCount} · Resolved: {resolvedCount}
              </Text>
            ) : null}
          </View>

          {state.status === "error" ? (
            <View style={commonStyles.card}>
              <View style={commonStyles.cardBody}>
                <Text style={commonStyles.sectionLabel}>Could not load incidents</Text>
                <ErrorMessage message={state.errorMessage} />

                <Pressable
                  style={({ pressed }) => [
                    commonStyles.outlineButton,
                    pressed && commonStyles.buttonPressed,
                  ]}
                  onPress={loadIncidents}
                >
                  <Text style={commonStyles.outlineButtonText}>Try again</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {state.status === "ready" && state.incidents.length === 0 ? (
            <View style={commonStyles.emptyCard}>
              <Text style={commonStyles.emptyTitle}>No incidents found</Text>
              <Text style={commonStyles.emptyText}>
                There are no incidents for the selected filters.
              </Text>
            </View>
          ) : null}

          {state.status === "ready" && state.incidents.length > 0 ? (
            <View style={styles.resultsCard}>
              {state.incidents.map((incident, index) => (
                <IncidentRow
                  key={incident.id}
                  incident={incident}
                  isLast={index === state.incidents.length - 1}
                />
              ))}
            </View>
          ) : null}

          <View style={commonStyles.actions}>
            <Pressable
              style={({ pressed }) => [
                commonStyles.btnRefresh,
                pressed && commonStyles.buttonPressed,
              ]}
              onPress={loadIncidents}
            >
              <Text style={commonStyles.btnRefreshText}>⟳ Refresh</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                commonStyles.btnBack,
                pressed && commonStyles.buttonPressed,
              ]}
              onPress={() => router.back()}
            >
              <Text style={commonStyles.btnBackText}>← Back</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  filterCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 16,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSubtle,
    letterSpacing: 0.3,
  },
  horizontalChips: {
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: "#00685f",
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.textSubtle,
    lineHeight: 18,
  },
  statusSegments: {
    flexDirection: "row",
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    padding: 4,
  },
  statusSegment: {
    flex: 1,
    minHeight: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  statusSegmentActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  statusSegmentText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  statusSegmentTextActive: {
    color: colors.primary,
  },
  filterActions: {
    gap: 10,
  },
  resultSummary: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  resultsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  incidentRow: {
    padding: 16,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    gap: 10,
  },
  incidentRowLast: {
    borderBottomWidth: 0,
  },
  incidentTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  incidentTitle: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  incidentDate: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.textSubtle,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeType: {
    backgroundColor: colors.surfaceMuted,
  },
  badgeSeverity: {
    backgroundColor: colors.warningSoft,
  },
  badgeOpen: {
    backgroundColor: colors.primaryMuted,
  },
  badgeResolved: {
    backgroundColor: colors.secondarySoft,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: fontWeight.extrabold,
  },
  badgeTextType: {
    color: colors.textMuted,
  },
  badgeTextSeverity: {
    color: colors.warning,
  },
  badgeTextOpen: {
    color: colors.primaryDark,
  },
  badgeTextResolved: {
    color: "#173bab",
  },
  reportedBy: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 19,
  },
  btnClear: {
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  btnClearText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
});