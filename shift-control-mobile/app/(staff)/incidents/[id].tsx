import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { getIncidentById } from "@/src/api/incidents";
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

type IncidentWithOptionalContext = Incident & {
  storeName?: string | null;
  reportedByName?: string | null;
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

function getStatusCopy(status: IncidentStatus) {
  if (status === "RESOLVED") {
    return {
      label: "RESOLVED",
      message: "This incident was reviewed and resolved.",
      isResolved: true,
    };
  }

  return {
    label: "OPEN",
    message: "This incident is still pending admin review.",
    isResolved: false,
  };
}

function getSeverityColors(severity: IncidentSeverity) {
  if (severity === "HIGH") {
    return {
      backgroundColor: "#ffdad6",
      color: "#93000a",
      dotColor: "#ba1a1a",
    };
  }

  if (severity === "MEDIUM") {
    return {
      backgroundColor: "#fff8e6",
      color: "#825100",
      dotColor: "#825100",
    };
  }

  return {
    backgroundColor: "#edf8f6",
    color: "#00685f",
    dotColor: "#00685f",
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

function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const colors = getSeverityColors(severity);

  return (
    <View style={[styles.badge, { backgroundColor: colors.backgroundColor }]}>
      <View style={[styles.badgeDot, { backgroundColor: colors.dotColor }]} />
      <Text style={[styles.badgeText, { color: colors.color }]}>
        {formatIncidentText(severity)}
      </Text>
    </View>
  );
}

function ContextRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={styles.contextIcon}>
        <Text style={styles.contextIconText}>◷</Text>
      </View>

      <View style={styles.contextTextGroup}>
        <Text style={styles.contextLabel}>{label}</Text>
        <Text style={styles.contextValue}>{value}</Text>
      </View>

      {onPress ? <Text style={styles.chevron}>›</Text> : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.contextRow}>{content}</View>;
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.contextRow,
        pressed && styles.rowPressed,
      ]}
      onPress={onPress}
    >
      {content}
    </Pressable>
  );
}

export default function IncidentDetailScreen() {
  const { user } = useAuth();
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

  const displayName = user?.fullName ?? user?.username ?? "Staff";
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
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <View>
          <Text style={styles.appBarTitle}>Incident detail</Text>
          {incidentId ? (
            <Text style={styles.appBarSubtitle}>{formatShortId(incidentId)}</Text>
          ) : null}
        </View>
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
  const incidentWithContext = incident as IncidentWithOptionalContext;
  const statusCopy = getStatusCopy(incident.status);

  return (
    <SafeAreaView style={styles.safeArea}>
      {appBar}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.statusBanner,
            statusCopy.isResolved
              ? styles.statusBannerResolved
              : styles.statusBannerOpen,
          ]}
        >
          <Text
            style={[
              styles.statusBannerIcon,
              statusCopy.isResolved
                ? styles.statusBannerIconResolved
                : styles.statusBannerIconOpen,
            ]}
          >
            {statusCopy.isResolved ? "✓" : "!"}
          </Text>

          <View style={styles.statusBannerTextGroup}>
            <Text
              style={[
                styles.statusBannerTitle,
                statusCopy.isResolved
                  ? styles.statusBannerTextResolved
                  : styles.statusBannerTextOpen,
              ]}
            >
              {statusCopy.label}
            </Text>
            <Text
              style={[
                styles.statusBannerMessage,
                statusCopy.isResolved
                  ? styles.statusBannerTextResolved
                  : styles.statusBannerTextOpen,
              ]}
            >
              {statusCopy.message}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.incidentTitle}>{incident.title}</Text>
            <Text style={styles.description}>{incident.description}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.sectionTitle}>Details</Text>

            <DetailRow
              label="Type"
              value={formatIncidentText(incident.type)}
            />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Severity</Text>
              <SeverityBadge severity={incident.severity} />
            </View>

            <DetailRow
              label="Status"
              value={formatIncidentText(incident.status)}
              valueStyle={
                incident.status === "RESOLVED"
                  ? styles.primaryValue
                  : styles.warningValue
              }
            />

            <DetailRow
              label="Created at"
              value={formatDateTime(incident.createdAt)}
            />

            <DetailRow
              label="Resolved at"
              value={
                incident.resolvedAt ? formatDateTime(incident.resolvedAt) : null
              }
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.sectionTitle}>Related context</Text>

            {incident.shiftId || incident.closureId || incident.saleId ? (
              <View style={styles.contextList}>
                {incident.shiftId ? (
                  <ContextRow
                    label="Shift ID"
                    value={formatShortId(incident.shiftId)}
                    onPress={() =>
                      router.push(`/(staff)/history/${incident.shiftId}`)
                    }
                  />
                ) : null}

                {incident.saleId ? (
                  <ContextRow
                    label="Sale ID"
                    value={formatShortId(incident.saleId)}
                    onPress={() =>
                      router.push(`/(staff)/sales/${incident.saleId}`)
                    }
                  />
                ) : null}

                {incident.closureId ? (
                  <ContextRow
                    label="Closure ID"
                    value={formatShortId(incident.closureId)}
                  />
                ) : null}
              </View>
            ) : (
              <Text style={styles.bodyText}>No related context available.</Text>
            )}
          </View>
        </View>

        {incidentWithContext.storeName || incidentWithContext.reportedByName ? (
          <View style={styles.infoGrid}>
            {incidentWithContext.storeName ? (
              <View style={styles.infoTilePrimary}>
                <Text style={styles.infoTileIcon}>⌖</Text>
                <View>
                  <Text style={styles.infoTileLabel}>Location</Text>
                  <Text style={styles.infoTileValue}>
                    {incidentWithContext.storeName}
                  </Text>
                </View>
              </View>
            ) : null}

            {incidentWithContext.reportedByName ? (
              <View style={styles.infoTileSecondary}>
                <Text style={styles.infoTileIconSecondary}>♙</Text>
                <View>
                  <Text style={styles.infoTileLabelSecondary}>Reported by</Text>
                  <Text style={styles.infoTileValue}>
                    {incidentWithContext.reportedByName}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {incident.resolutionNote ? (
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.sectionTitle}>Resolution note</Text>
              <View style={styles.noteBlock}>
                <Text style={styles.noteText}>{incident.resolutionNote}</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.btnRefresh,
              pressed && styles.buttonPressed,
            ]}
            onPress={loadIncident}
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

        <Pressable
          style={({ pressed }) => [
            styles.btnDashboard,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.replace("/(staff)/home")}
        >
          <Text style={styles.btnDashboardText}>← Return to Dashboard</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#faf8ff",
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
  appBarSubtitle: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#6d7a77",
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
    marginHorizontal: -20,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusBannerOpen: {
    backgroundColor: "#ffddb8",
  },
  statusBannerResolved: {
    backgroundColor: "#edf8f6",
  },
  statusBannerIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: "center",
    textAlignVertical: "center",
    overflow: "hidden",
    fontSize: 13,
    fontWeight: "900",
  },
  statusBannerIconOpen: {
    backgroundColor: "#825100",
    color: "#ffffff",
  },
  statusBannerIconResolved: {
    backgroundColor: "#00685f",
    color: "#ffffff",
  },
  statusBannerTextGroup: {
    flex: 1,
    gap: 1,
  },
  statusBannerTitle: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2,
  },
  statusBannerMessage: {
    fontSize: 12,
    lineHeight: 17,
  },
  statusBannerTextOpen: {
    color: "#653e00",
  },
  statusBannerTextResolved: {
    color: "#00685f",
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
    fontSize: 18,
    fontWeight: "700",
    color: "#131b2e",
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: "#3d4947",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#00685f",
    letterSpacing: 0.7,
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
  detailLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#6d7a77",
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#131b2e",
    textAlign: "right",
  },
  primaryValue: {
    color: "#00685f",
  },
  warningValue: {
    color: "#825100",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  contextList: {
    borderRadius: 12,
    backgroundColor: "#f2f3ff",
    overflow: "hidden",
  },
  contextRow: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  contextIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#d2f5f0",
    alignItems: "center",
    justifyContent: "center",
  },
  contextIconText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#00685f",
  },
  contextTextGroup: {
    flex: 1,
    gap: 3,
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6d7a77",
  },
  contextValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#131b2e",
  },
  chevron: {
    fontSize: 24,
    color: "#00685f",
  },
  rowPressed: {
    backgroundColor: "#edf8f6",
  },
  infoGrid: {
    flexDirection: "row",
    gap: 12,
  },
  infoTilePrimary: {
    flex: 1,
    minHeight: 112,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#b9ddd8",
    backgroundColor: "#edf8f6",
    padding: 14,
    justifyContent: "space-between",
  },
  infoTileSecondary: {
    flex: 1,
    minHeight: 112,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d8dcff",
    backgroundColor: "#f2f3ff",
    padding: 14,
    justifyContent: "space-between",
  },
  infoTileIcon: {
    fontSize: 18,
    fontWeight: "900",
    color: "#00685f",
  },
  infoTileIconSecondary: {
    fontSize: 18,
    fontWeight: "900",
    color: "#3755c3",
  },
  infoTileLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#00685f",
  },
  infoTileLabelSecondary: {
    fontSize: 12,
    fontWeight: "800",
    color: "#3755c3",
  },
  infoTileValue: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "800",
    color: "#131b2e",
  },
  noteBlock: {
    borderLeftWidth: 4,
    borderLeftColor: "#b9ddd8",
    paddingLeft: 14,
    paddingVertical: 3,
  },
  noteText: {
    fontSize: 15,
    lineHeight: 23,
    color: "#3d4947",
    fontStyle: "italic",
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#3d4947",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 4,
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
  btnDashboard: {
    height: 48,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#00685f",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  btnDashboardText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#00685f",
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