import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { listShifts } from "@/src/api/shifts";
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { colors, fontWeight, fontSize, shadows, radius } from "@/src/theme";
import { LoadingState } from "@/src/components/LoadingState";
import type { Shift, ShiftStatus, ShiftType } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";

type ShiftsState =
  | {
      status: "loading";
      shifts: Shift[];
      errorMessage: null;
    }
  | {
      status: "ready";
      shifts: Shift[];
      errorMessage: null;
    }
  | {
      status: "error";
      shifts: Shift[];
      errorMessage: string;
    };

function ShiftTypeBadge({ type }: { type: ShiftType }) {
  const style = type === "DAY" ? styles.badgeDay : styles.badgeNight;
  const textStyle = type === "DAY" ? styles.badgeDayText : styles.badgeNightText;
  return <Text style={[styles.badge, style, textStyle]}>{type}</Text>;
}

function ShiftStatusBadge({ status }: { status: ShiftStatus }) {
  const style = status === "OPEN" ? styles.badgeOpen : styles.badgeClosed;
  const textStyle =
    status === "OPEN" ? styles.badgeOpenText : styles.badgeClosedText;
  return <Text style={[styles.badge, style, textStyle]}>{status}</Text>;
}

function ShiftRow({ shift }: { shift: Shift }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.shiftRow, pressed && styles.shiftRowPressed]}
      onPress={() => router.push(`/(staff)/history/${shift.id}` as never)}
    >
      <View style={styles.shiftMain}>
        <View style={styles.badgeRow}>
          <ShiftTypeBadge type={shift.type} />
          <ShiftStatusBadge status={shift.status} />
        </View>
        <Text style={styles.shiftStoreName}>
          {shift.storeName || "Store"}
        </Text>
        <Text style={styles.shiftMeta}>
          Opened: {formatDateTime(shift.openedAt)}
        </Text>
        {shift.closedAt ? (
          <Text style={styles.shiftMeta}>
            Closed: {formatDateTime(shift.closedAt)}
          </Text>
        ) : null}
      </View>
      <Text style={styles.shiftViewAction}>View &rsaquo;</Text>
    </Pressable>
  );
}

export default function StaffHistoryScreen() {

  const [state, setState] = useState<ShiftsState>({
    status: "loading",
    shifts: [],
    errorMessage: null,
  });

  const loadShifts = useCallback(async () => {
    setState({
      status: "loading",
      shifts: [],
      errorMessage: null,
    });

    try {
      const shifts = await listShifts();

      setState({
        status: "ready",
        shifts,
        errorMessage: null,
      });
    } catch (error) {
      setState({
        status: "error",
        shifts: [],
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadShifts();
    }, [loadShifts])
  );

  const openShifts = useMemo(
    () =>
      state.status === "ready"
        ? state.shifts.filter((shift) => shift.status === "OPEN")
        : [],
    [state]
  );

  const closedShifts = useMemo(
    () =>
      state.status === "ready"
        ? state.shifts.filter((shift) => shift.status === "CLOSED")
        : [],
    [state]
  );

  if (state.status === "loading") {
    return <LoadingState message="Loading shifts..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppTopBar variant="back" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>My shifts</Text>
          <Text style={styles.pageSubtitle}>
            Review your open and closed shift history.
          </Text>
        </View>

        {/* Error state */}
        {state.status === "error" ? (
          <View style={styles.card}>
            <ErrorMessage message={state.errorMessage} />
            <Pressable style={styles.btnOutline} onPress={loadShifts}>
              <Text style={styles.btnOutlineText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Open shifts section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>OPEN SHIFTS</Text>
          </View>
          {openShifts.length === 0 ? (
            <Text style={styles.emptyText}>No open shifts.</Text>
          ) : (
            openShifts.map((shift, index) => (
              <View key={shift.id}>
                {index > 0 && <View style={styles.rowDivider} />}
                <ShiftRow shift={shift} />
              </View>
            ))
          )}
        </View>

        {/* Closed shifts section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>CLOSED SHIFTS</Text>
          </View>
          {closedShifts.length === 0 ? (
            <Text style={styles.emptyText}>No closed shifts yet.</Text>
          ) : (
            closedShifts.map((shift, index) => (
              <View key={shift.id}>
                {index > 0 && <View style={styles.rowDivider} />}
                <ShiftRow shift={shift} />
              </View>
            ))
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
            onPress={loadShifts}
          >
            <Text style={styles.btnPrimaryText}>⟳  Refresh History</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btnBack, pressed && styles.btnPressed]}
            onPress={() => router.back()}
          >
            <Text style={styles.btnBackText}>← Back</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Scroll
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },

  // Page header
  pageHeader: {
    gap: 4,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  pageSubtitle: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    lineHeight: 22,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.card,
  },

  // Section header inside card
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    letterSpacing: 1,
  },

  // Empty state inside section
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  // Row divider
  rowDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginHorizontal: 16,
  },

  // Shift row
  shiftRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  shiftRowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  shiftMain: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },

  // Badges
  badge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  badgeDay: {
    backgroundColor: colors.primaryMuted,
  },
  badgeDayText: {
    color: "#004f49",
  },
  badgeNight: {
    backgroundColor: "#fff3d6",
  },
  badgeNightText: {
    color: colors.warning,
  },
  badgeOpen: {
    backgroundColor: "#e8eeff",
  },
  badgeOpenText: {
    color: colors.secondary,
  },
  badgeClosed: {
    backgroundColor: "#e8ecf0",
  },
  badgeClosedText: {
    color: "#4d5b5a",
  },

  // Shift row text
  shiftStoreName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  shiftMeta: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 18,
  },
  shiftViewAction: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },

  // Action buttons
  actions: {
    gap: 10,
    marginTop: 4,
  },
  btnPrimary: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primaryButton,
  },
  btnPrimaryText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.extrabold,
    color: colors.surface,
    letterSpacing: 0.3,
  },
  btnBack: {
    height: 48,
    backgroundColor: colors.borderSoft,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnBackText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.secondary,
  },
  btnOutline: {
    height: 44,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    margin: 16,
  },
  btnOutlineText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  btnPressed: {
    opacity: 0.8,
  },
});