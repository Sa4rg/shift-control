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
      backgroundColor: colors.dangerSoft,
      color: "#93000a",
      dotColor: "#ba1a1a",
    };
  }

  if (severity === "MEDIUM") {
    return {
      backgroundColor: colors.warningSoft,
      color: colors.warning,
      dotColor: "#825100",
    };
  }

  return {
    backgroundColor: colors.primarySoft,
    color: colors.primary,
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
    backgroundColor: colors.background,
  },
  appBar: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
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
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  appBarTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
  },
  appBarSubtitle: {
    marginTop: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSubtle,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extrabold,
    color: colors.secondaryDark,
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
    backgroundColor: colors.primarySoft,
  },
  statusBannerIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: "center",
    textAlignVertical: "center",
    overflow: "hidden",
    fontSize: fontSize.md,
    fontWeight: "900",
  },
  statusBannerIconOpen: {
    backgroundColor: "#825100",
    color: colors.surface,
  },
  statusBannerIconResolved: {
    backgroundColor: colors.primary,
    color: colors.surface,
  },
  statusBannerTextGroup: {
    flex: 1,
    gap: 1,
  },
  statusBannerTitle: {
    fontSize: fontSize.md,
    fontWeight: "900",
    letterSpacing: 2,
  },
  statusBannerMessage: {
    fontSize: fontSize.sm,
    lineHeight: 17,
  },
  statusBannerTextOpen: {
    color: "#653e00",
  },
  statusBannerTextResolved: {
    color: colors.primary,
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
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: fontSize.lg,
    lineHeight: 24,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: 0.7,
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
  detailLabel: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textSubtle,
  },
  detailValue: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: "right",
  },
  primaryValue: {
    color: colors.primary,
  },
  warningValue: {
    color: colors.warning,
  },
  badge: {
    borderRadius: radius.pill,
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
    fontWeight: fontWeight.extrabold,
  },
  contextList: {
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },
  contextRow: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  contextIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  contextIconText: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.primary,
  },
  contextTextGroup: {
    flex: 1,
    gap: 3,
  },
  contextLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSubtle,
  },
  contextValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  chevron: {
    fontSize: 24,
    color: colors.primary,
  },
  rowPressed: {
    backgroundColor: colors.primarySoft,
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
    backgroundColor: colors.primarySoft,
    padding: 14,
    justifyContent: "space-between",
  },
  infoTileSecondary: {
    flex: 1,
    minHeight: 112,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d8dcff",
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    justifyContent: "space-between",
  },
  infoTileIcon: {
    fontSize: fontSize.xxl,
    fontWeight: "900",
    color: colors.primary,
  },
  infoTileIconSecondary: {
    fontSize: fontSize.xxl,
    fontWeight: "900",
    color: colors.secondary,
  },
  infoTileLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
  },
  infoTileLabelSecondary: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extrabold,
    color: colors.secondary,
  },
  infoTileValue: {
    marginTop: 3,
    fontSize: fontSize.base,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  noteBlock: {
    borderLeftWidth: 4,
    borderLeftColor: "#b9ddd8",
    paddingLeft: 14,
    paddingVertical: 3,
  },
  noteText: {
    fontSize: fontSize.lg,
    lineHeight: 23,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  bodyText: {
    fontSize: fontSize.base,
    lineHeight: 20,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 4,
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
    fontWeight: "900",
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
    fontWeight: "900",
    color: colors.textMuted,
  },
  btnDashboard: {
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: "#00685f",
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  btnDashboardText: {
    fontSize: fontSize.base,
    fontWeight: "900",
    color: colors.primary,
  },
  btnOutline: {
    height: 46,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: "#00685f",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  btnOutlineText: {
    fontSize: fontSize.base,
    fontWeight: "900",
    color: colors.primary,
  },
  buttonPressed: {
    opacity: 0.72,
  },
});