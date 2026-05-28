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
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
} from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { colors, fontWeight, fontSize, shadows, radius } from "@/src/theme";

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
      backgroundColor: colors.dangerSoft,
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
    backgroundColor: colors.primaryMuted,
    color: colors.primaryDark,
  };
}

function getStatusColors(status: IncidentStatus) {
  if (status === "RESOLVED") {
    return {
      backgroundColor: colors.primaryMuted,
      color: colors.primaryDark,
      bannerBackground: "#edf8f6",
      bannerBorder: "#b9ddd8",
      bannerText: "#00685f",
      message: "Incident resolved — no further action required",
    };
  }

  return {
    backgroundColor: colors.warningSoft,
    color: colors.warning,
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

  if (state.status === "loading") {
    return <LoadingState message="Loading incident..." />;
  }

  const appBar = <AppTopBar variant="back" />;

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
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  statusBannerText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    textTransform: "capitalize",
  },
  pageHeader: {
    gap: 5,
  },
  pageTitle: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.card,
  },
  cardBody: {
    padding: 16,
    gap: 14,
  },
  incidentTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  description: {
    fontSize: fontSize.lg,
    lineHeight: 23,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    letterSpacing: 0.6,
  },
  bodyText: {
    fontSize: fontSize.base,
    lineHeight: 20,
    color: colors.textMuted,
  },
  detailRow: {
    minHeight: 34,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detailRowHorizontal: {
    minHeight: 34,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  detailValue: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: "right",
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
  },
  contextList: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: "hidden",
  },
  contextRow: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contextLabel: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: colors.textSubtle,
  },
  contextValue: {
    marginTop: 3,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  chevron: {
    fontSize: 24,
    color: colors.primary,
  },
  noteInput: {
    minHeight: 92,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    padding: 12,
    fontSize: fontSize.base,
    lineHeight: 20,
    color: colors.text,
  },
  resolutionText: {
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 12,
    fontSize: fontSize.base,
    lineHeight: 21,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 4,
  },
  btnPrimary: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primaryButton,
  },
  btnDisabled: {
    backgroundColor: colors.primaryDisabled,
  },
  btnPrimaryText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.extrabold,
    color: colors.surface,
  },
  btnRefresh: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: "#89f5e7",
    alignItems: "center",
    justifyContent: "center",
  },
  btnRefreshText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  btnBack: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  btnBackText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  btnOutline: {
    height: 46,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  btnOutlineText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  buttonPressed: {
    opacity: 0.72,
  },
});