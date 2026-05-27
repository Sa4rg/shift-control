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
import { useAuth } from "@/src/auth/AuthContext";
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
        pressed && styles.buttonPressed,
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
        pressed && styles.buttonPressed,
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
        pressed && styles.rowPressed,
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
  const { user } = useAuth();

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

  const displayName = user?.fullName ?? user?.username ?? "Admin";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (referenceDataState.status === "loading" || state.status === "loading") {
    return <LoadingState message="Loading incidents..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <Pressable
            style={({ pressed }) => [
              styles.appBarBackButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>

          <Text style={styles.appBarTitle}>Shift Control</Text>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Incidents</Text>
            <Text style={styles.pageSubtitle}>
              Review and manage all operational issues across stores.
            </Text>
          </View>

          {referenceDataState.status === "error" ? (
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <Text style={styles.sectionTitle}>Could not load filters</Text>
                <ErrorMessage message={referenceDataState.errorMessage} />

                <Pressable
                  style={({ pressed }) => [
                    styles.btnOutline,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={loadReferenceData}
                >
                  <Text style={styles.btnOutlineText}>Try again</Text>
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
                  styles.btnPrimary,
                  pressed && styles.buttonPressed,
                ]}
                onPress={loadIncidents}
              >
                <Text style={styles.btnPrimaryText}>⟳ Load incidents</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.btnClear,
                  pressed && styles.buttonPressed,
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
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <Text style={styles.sectionTitle}>Could not load incidents</Text>
                <ErrorMessage message={state.errorMessage} />

                <Pressable
                  style={({ pressed }) => [
                    styles.btnOutline,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={loadIncidents}
                >
                  <Text style={styles.btnOutlineText}>Try again</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {state.status === "ready" && state.incidents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No incidents found</Text>
              <Text style={styles.emptyText}>
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

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.btnRefresh,
                pressed && styles.buttonPressed,
              ]}
              onPress={loadIncidents}
            >
              <Text style={styles.btnRefreshText}>⟳ Refresh</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnBack,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.back()}
            >
              <Text style={styles.btnBackText}>← Back</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#faf8ff",
  },
  keyboardView: {
    flex: 1,
  },
  appBar: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
  },
  appBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  appBarBackButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 20,
    fontWeight: "700",
    color: "#00685f",
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#00685f",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#dde1ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bcc9c6",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#00217a",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    gap: 16,
  },
  pageHeader: {
    gap: 5,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#131b2e",
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 15,
    color: "#3d4947",
    lineHeight: 22,
  },
  filterCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    padding: 16,
    gap: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: "#3d4947",
  },
  horizontalChips: {
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#f2f3ff",
    borderWidth: 1,
    borderColor: "#eaedff",
  },
  filterChipActive: {
    backgroundColor: "#00685f",
    borderColor: "#00685f",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#3d4947",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  helperText: {
    fontSize: 12,
    color: "#6d7a77",
    lineHeight: 18,
  },
  statusSegments: {
    flexDirection: "row",
    borderRadius: 12,
    backgroundColor: "#f2f3ff",
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
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  statusSegmentText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#3d4947",
  },
  statusSegmentTextActive: {
    color: "#00685f",
  },
  filterActions: {
    gap: 10,
  },
  resultSummary: {
    fontSize: 13,
    color: "#3d4947",
  },
  resultsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  incidentRow: {
    padding: 16,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
    gap: 10,
  },
  incidentRowLast: {
    borderBottomWidth: 0,
  },
  rowPressed: {
    opacity: 0.72,
  },
  incidentTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  incidentTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#131b2e",
  },
  incidentDate: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6d7a77",
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeType: {
    backgroundColor: "#f2f3ff",
  },
  badgeSeverity: {
    backgroundColor: "#fff8e6",
  },
  badgeOpen: {
    backgroundColor: "#d2f5f0",
  },
  badgeResolved: {
    backgroundColor: "#dde1ff",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  badgeTextType: {
    color: "#3d4947",
  },
  badgeTextSeverity: {
    color: "#825100",
  },
  badgeTextOpen: {
    color: "#005049",
  },
  badgeTextResolved: {
    color: "#173bab",
  },
  reportedBy: {
    fontSize: 13,
    color: "#3d4947",
    lineHeight: 19,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardBody: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#00685f",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    padding: 18,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#131b2e",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#3d4947",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 4,
  },
  btnPrimary: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#00685f",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#ffffff",
  },
  btnClear: {
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  btnClearText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#00685f",
  },
  btnRefresh: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#89f5e7",
    alignItems: "center",
    justifyContent: "center",
  },
  btnRefreshText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#005049",
  },
  btnBack: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#bcc9c6",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  btnBackText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#3d4947",
  },
  btnOutline: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#00685f",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#00685f",
  },
  buttonPressed: {
    opacity: 0.72,
  },
});