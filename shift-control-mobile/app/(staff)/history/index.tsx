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
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
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
  const { user } = useAuth();

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

  const displayName = user?.fullName ?? user?.username ?? "Staff";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (state.status === "loading") {
    return <LoadingState message="Loading shifts..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* AppBar */}
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <Text style={styles.menuIcon}>≡</Text>
          <Text style={styles.appBarTitle}>Shift Control</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

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
    backgroundColor: "#faf8ff",
  },

  // AppBar
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
    gap: 16,
  },
  menuIcon: {
    fontSize: 20,
    color: "#00685f",
  },
  appBarTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#00685f",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#708cfd",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00217a",
  },

  // Scroll
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  // Page header
  pageHeader: {
    gap: 4,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#131b2e",
  },
  pageSubtitle: {
    fontSize: 16,
    color: "#3d4947",
    lineHeight: 22,
  },

  // Card
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  // Section header inside card
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f2f3ff",
    borderBottomWidth: 1,
    borderBottomColor: "#d8e0dd",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#131b2e",
    letterSpacing: 1,
  },

  // Empty state inside section
  emptyText: {
    fontSize: 14,
    color: "#3d4947",
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
    backgroundColor: "#f2f3ff",
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
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  badgeDay: {
    backgroundColor: "#d2f5f0",
  },
  badgeDayText: {
    color: "#004f49",
  },
  badgeNight: {
    backgroundColor: "#fff3d6",
  },
  badgeNightText: {
    color: "#825100",
  },
  badgeOpen: {
    backgroundColor: "#e8eeff",
  },
  badgeOpenText: {
    color: "#3755c3",
  },
  badgeClosed: {
    backgroundColor: "#e8ecf0",
  },
  badgeClosedText: {
    color: "#4d5b5a",
  },

  // Shift row text
  shiftStoreName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#131b2e",
  },
  shiftMeta: {
    fontSize: 13,
    color: "#3d4947",
    lineHeight: 18,
  },
  shiftViewAction: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00685f",
  },

  // Action buttons
  actions: {
    gap: 10,
    marginTop: 4,
  },
  btnPrimary: {
    height: 48,
    backgroundColor: "#00685f",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  btnBack: {
    height: 48,
    backgroundColor: "#eaedff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnBackText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3755c3",
  },
  btnOutline: {
    height: 44,
    borderWidth: 1.5,
    borderColor: "#bcc9c6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    margin: 16,
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#131b2e",
  },
  btnPressed: {
    opacity: 0.8,
  },
});