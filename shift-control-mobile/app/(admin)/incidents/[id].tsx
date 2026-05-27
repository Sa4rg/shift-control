import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { getIncidentById, resolveIncident } from "@/src/api/incidents";
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
} from "@/src/types/api";
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

function formatShortId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function formatIncidentText(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSeverityColors(severity: IncidentSeverity) {
  if (severity === "HIGH") {
    return {
      backgroundColor: "#ffdad6",
      color: "#93000a",
    };
  }

  if (severity === "MEDIUM") {
    return {
      backgroundColor: "#ffddb8",
      color: "#653e00",
    };
  }

  return {
    backgroundColor: "#d2f5f0",
    color: "#005049",
  };
}

function getStatusColors(status: IncidentStatus) {
  if (status === "RESOLVED") {
    return {
      backgroundColor: "#d2f5f0",
      color: "#005049",
      bannerBackground: "#edf8f6",
      bannerBorder: "#b9ddd8",
      bannerText: "#00685f",
      message: "Incident resolved — no further action required",
    };
  }

  return {
    backgroundColor: "#fff8e6",
    color: "#825100",
    bannerBackground: "#ffddb8",
    bannerBorder: "#ffb95f",
    bannerText: "#653e00",
    message: "Incident open — resolution required",
  };
}

function DetailRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string | null;
  valueStyle?: object;
}) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: IncidentStatus }) {
  const colors = getStatusColors(status);

  return (
    <View style={[styles.badge, { backgroundColor: colors.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: colors.color }]}>
        {formatIncidentText(status)}
      </Text>
    </View>
  );
}

function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const colors = getSeverityColors(severity);

  return (
    <View style={[styles.badge, { backgroundColor: colors.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: colors.color }]}>
        {formatIncidentText(severity)}
      </Text>
    </View>
  );
}

export default function AdminIncidentDetailScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const incidentId = params.id;

  const [state, setState] = useState<IncidentDetailState>({
    status: "loading",
    incident: null,
    errorMessage: null,
  });

  const [resolutionNote, setResolutionNote] = useState("");
  const [resolveErrorMessage, setResolveErrorMessage] = useState<string | null>(
    null
  );
  const [isResolving, setIsResolving] = useState(false);

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

  async function handleResolveIncident() {
    if (
      !incidentId ||
      state.status !== "ready" ||
      state.incident.status === "RESOLVED" ||
      resolutionNote.trim().length === 0 ||
      isResolving
    ) {
      return;
    }

    setIsResolving(true);
    setResolveErrorMessage(null);

    try {
      const updatedIncident = await resolveIncident(incidentId, {
        resolutionNote: resolutionNote.trim(),
      });

      setState({
        status: "ready",
        incident: updatedIncident,
        errorMessage: null,
      });
      setResolutionNote("");
    } catch (error) {
      setResolveErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsResolving(false);
    }
  }

  useEffect(() => {
    void loadIncident();
  }, [loadIncident]);

  const displayName = user?.fullName ?? user?.username ?? "Admin";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (state.status === "loading") {
    return <LoadingState message="Loading incident..." />;
  }

  const appBar = (
    <View style={styles.appBar}>
      <View style={styles.appBarLeft}>
        <Pressable
          style={({ pressed }) => [
            styles.appBarBackButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.back()}
          disabled={isResolving}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <Text style={styles.appBarTitle}>Incident detail</Text>
      </View>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    </View>
  );

  if (state.status === "error") {
    return (
      <SafeAreaView style={styles.safeArea}>
        {appBar}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.sectionTitle}>Could not load incident</Text>
              <ErrorMessage message={state.errorMessage} />

              <Pressable
                style={({ pressed }) => [
                  styles.btnOutline,
                  pressed && styles.buttonPressed,
                ]}
                onPress={loadIncident}
              >
                <Text style={styles.btnOutlineText}>Try again</Text>
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
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const incident = state.incident;
  const statusColors = getStatusColors(incident.status);
  const canResolve =
    incident.status !== "RESOLVED" &&
    resolutionNote.trim().length > 0 &&
    !isResolving;

  return (
    <SafeAreaView style={styles.safeArea}>
      {appBar}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: statusColors.bannerBackground,
                borderColor: statusColors.bannerBorder,
              },
            ]}
          >
            <Text style={[styles.statusBannerIcon, { color: statusColors.bannerText }]}>
              ⓘ
            </Text>
            <Text style={[styles.statusBannerText, { color: statusColors.bannerText }]}>
              {statusColors.message}
            </Text>
          </View>

          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Incident detail</Text>
            <Text style={styles.pageSubtitle}>
              INCIDENT ID: {formatShortId(incident.id)}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.incidentTitle}>{incident.title}</Text>
              <Text style={styles.description}>{incident.description}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardBody}>
              <DetailRow
                label="Type"
                value={formatIncidentText(incident.type)}
              />

              <View style={styles.detailRowHorizontal}>
                <Text style={styles.detailLabel}>Severity</Text>
                <SeverityBadge severity={incident.severity} />
              </View>

              <View style={styles.detailRowHorizontal}>
                <Text style={styles.detailLabel}>Status</Text>
                <StatusBadge status={incident.status} />
              </View>

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
          </View>

          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.sectionTitle}>Related context</Text>

              {incident.shiftId || incident.closureId || incident.saleId ? (
                <View style={styles.contextList}>
                  {incident.shiftId ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.contextRow,
                        pressed && styles.rowPressed,
                      ]}
                      onPress={() =>
                        router.push(`/(admin)/shifts/${incident.shiftId}`)
                      }
                    >
                      <View>
                        <Text style={styles.contextLabel}>Shift ID</Text>
                        <Text style={styles.contextValue}>
                          {formatShortId(incident.shiftId)}
                        </Text>
                      </View>

                      <Text style={styles.chevron}>›</Text>
                    </Pressable>
                  ) : null}

                  {incident.saleId ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.contextRow,
                        pressed && styles.rowPressed,
                      ]}
                      onPress={() =>
                        router.push(`/(admin)/sales/${incident.saleId}`)
                      }
                    >
                      <View>
                        <Text style={styles.contextLabel}>Sale ID</Text>
                        <Text style={styles.contextValue}>
                          {formatShortId(incident.saleId)}
                        </Text>
                      </View>

                      <Text style={styles.chevron}>›</Text>
                    </Pressable>
                  ) : null}

                  {incident.closureId ? (
                    <View style={styles.contextRow}>
                      <View>
                        <Text style={styles.contextLabel}>Closure ID</Text>
                        <Text style={styles.contextValue}>
                          {formatShortId(incident.closureId)}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.bodyText}>No related context available.</Text>
              )}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.sectionTitle}>Resolution note</Text>

              {incident.status === "RESOLVED" ? (
                <>
                  <Text style={styles.bodyText}>
                    This incident has already been resolved.
                  </Text>

                  {incident.resolutionNote ? (
                    <Text style={styles.resolutionText}>
                      {incident.resolutionNote}
                    </Text>
                  ) : null}

                  <DetailRow label="Resolved by" value={incident.resolvedByName} />

                  <DetailRow
                    label="Resolved at"
                    value={
                      incident.resolvedAt
                        ? formatDateTime(incident.resolvedAt)
                        : null
                    }
                  />
                </>
              ) : (
                <>
                  <TextInput
                    style={styles.noteInput}
                    value={resolutionNote}
                    onChangeText={setResolutionNote}
                    placeholder="Enter resolution steps..."
                    placeholderTextColor="#6d7a77"
                    multiline
                    autoCapitalize="sentences"
                    autoCorrect={false}
                    editable={!isResolving}
                    textAlignVertical="top"
                  />

                  {resolveErrorMessage ? (
                    <ErrorMessage message={resolveErrorMessage} />
                  ) : null}

                  <Pressable
                    style={({ pressed }) => [
                      styles.btnPrimary,
                      !canResolve && styles.btnDisabled,
                      pressed && canResolve && styles.buttonPressed,
                    ]}
                    onPress={handleResolveIncident}
                    disabled={!canResolve}
                  >
                    <Text style={styles.btnPrimaryText}>
                      {isResolving ? "Resolving…" : "✓ Resolve incident"}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.btnRefresh,
                pressed && styles.buttonPressed,
              ]}
              onPress={loadIncident}
              disabled={isResolving}
            >
              <Text style={styles.btnRefreshText}>⟳ Refresh</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnBack,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.back()}
              disabled={isResolving}
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
  statusBanner: {
    borderWidth: 1,
    borderRadius: 0,
    marginHorizontal: -20,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusBannerIcon: {
    fontSize: 16,
    fontWeight: "900",
  },
  statusBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "capitalize",
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
    fontSize: 12,
    fontWeight: "800",
    color: "#3d4947",
    letterSpacing: 0.8,
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
    gap: 14,
  },
  incidentTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#00685f",
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    color: "#3d4947",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#131b2e",
    letterSpacing: 0.6,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#3d4947",
  },
  detailRow: {
    minHeight: 34,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detailRowHorizontal: {
    minHeight: 34,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    color: "#3d4947",
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#131b2e",
    textAlign: "right",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  contextList: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eaedff",
    overflow: "hidden",
  },
  contextRow: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contextLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6d7a77",
  },
  contextValue: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "800",
    color: "#131b2e",
  },
  chevron: {
    fontSize: 24,
    color: "#00685f",
  },
  noteInput: {
    minHeight: 92,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bcc9c6",
    backgroundColor: "#f8fafc",
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    color: "#131b2e",
  },
  resolutionText: {
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#eaedff",
    padding: 12,
    fontSize: 14,
    lineHeight: 21,
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
  btnDisabled: {
    backgroundColor: "#9ecbc7",
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#ffffff",
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
  rowPressed: {
    backgroundColor: "#f2f3ff",
  },
  buttonPressed: {
    opacity: 0.72,
  },
});