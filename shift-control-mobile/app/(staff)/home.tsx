import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import {
  getCurrentShift,
  openShift,
  type CurrentShiftResult,
} from "@/src/api/shifts";
import { listCurrentShiftSales } from "@/src/api/sales";
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { colors, commonStyles, fontWeight, fontSize, radius } from "@/src/theme";
import { AppTopBar } from "@/src/components/AppTopBar";
import { LoadingState } from "@/src/components/LoadingState";
import type { Sale, ShiftType } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { formatMoney } from "@/src/utils/money";

import {
  getCurrentWifiSsid,
  type WifiConnectionResult,
} from "@/src/device/wifi";

type ShiftLoadState =
  | { status: "loading"; result: null; errorMessage: null }
  | { status: "ready"; result: CurrentShiftResult; errorMessage: null }
  | { status: "error"; result: null; errorMessage: string };

type SalesLoadState =
  | { status: "idle"; sales: Sale[]; errorMessage: null }
  | { status: "loading"; sales: Sale[]; errorMessage: null }
  | { status: "ready"; sales: Sale[]; errorMessage: null }
  | { status: "error"; sales: Sale[]; errorMessage: string };

function getPaymentLabel(sale: Sale): string {
  if (sale.payments.length === 0) return "�";
  if (sale.payments.length === 1) return sale.payments[0].method;
  return "SPLIT";
}

function getSaleLabel(sale: Sale): string {
  return sale.items[0]?.productName ?? `Sale ${sale.id.slice(0, 8)}`;
}

type WifiFailureStatus = Exclude<
  WifiConnectionResult["status"],
  "connected"
>;

const WIFI_ERROR_MESSAGES: Record<WifiFailureStatus, string> = {
  not_connected:
    "You are not connected to Wi-Fi. Connect to the store Wi-Fi network and try again.",
  permission_denied:
    "Location permission is required to verify the store Wi-Fi network. Allow it in your device settings and try again.",
  ssid_unavailable:
    "The Wi-Fi network could not be verified. Make sure Wi-Fi and location services are enabled, then try again.",
};

export default function StaffHomeScreen() {
  const { user, logout } = useAuth();

  const [shiftState, setShiftState] = useState<ShiftLoadState>({
    status: "loading",
    result: null,
    errorMessage: null,
  });
  const [salesState, setSalesState] = useState<SalesLoadState>({
    status: "idle",
    sales: [],
    errorMessage: null,
  });
  const [openingShiftType, setOpeningShiftType] = useState<ShiftType | null>(
    null
  );
  const [openShiftErrorMessage, setOpenShiftErrorMessage] = useState<
    string | null
  >(null);

  const loadCurrentShift = useCallback(async () => {
    setShiftState({ status: "loading", result: null, errorMessage: null });
    setSalesState({ status: "idle", sales: [], errorMessage: null });

    try {
      const result = await getCurrentShift();
      setShiftState({ status: "ready", result, errorMessage: null });

      if (result.status === "active") {
        setSalesState({ status: "loading", sales: [], errorMessage: null });
        try {
          const sales = await listCurrentShiftSales();
          setSalesState({ status: "ready", sales, errorMessage: null });
        } catch (error) {
          setSalesState({
            status: "error",
            sales: [],
            errorMessage: getApiErrorMessage(error),
          });
        }
      }
    } catch (error) {
      setShiftState({
        status: "error",
        result: null,
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCurrentShift();
    }, [loadCurrentShift])
  );

  const visibleSales = salesState.sales.slice(0, 5);
  const activeSales = salesState.sales.filter(s => s.status === "ACTIVE");
  const activeSalesCount = activeSales.length;
  const shiftTotal = activeSales.reduce(
    (sum, s) => sum + s.finalTotalAmount,
    0
  );

  async function handleOpenShift(type: ShiftType) {
    if (openingShiftType) return;

    setOpeningShiftType(type);
    setOpenShiftErrorMessage(null);

    try {
      const wifiResult = await getCurrentWifiSsid();

      if (wifiResult.status !== "connected") {
        setOpenShiftErrorMessage(
          WIFI_ERROR_MESSAGES[wifiResult.status]
        );
        return;
      }

      await openShift({
        type,
        wifiSsid: wifiResult.ssid,
      });

      await loadCurrentShift();
    } catch (error) {
      setOpenShiftErrorMessage(getApiErrorMessage(error));
    } finally {
      setOpeningShiftType(null);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/");
  }

  if (shiftState.status === "loading") {
    return <LoadingState message="Checking current shift..." />;
  }

  const activeShift =
    shiftState.status === "ready" && shiftState.result.status === "active"
      ? shiftState.result.shift
      : null;

  const hasNoActiveShift =
    shiftState.status === "ready" && shiftState.result.status === "none";

  const displayName = user?.fullName ?? user?.username ?? "Staff";
  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <AppTopBar variant="root" />

      <ScrollView
        contentContainerStyle={commonStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page header */}
        <View style={commonStyles.pageHeader}>
          <Text style={commonStyles.pageTitle}>Staff home</Text>
          <Text style={commonStyles.pageSubtitle}>Welcome, {displayName}</Text>
        </View>

        {/* Error loading shift */}
        {shiftState.status === "error" ? (
          <View style={commonStyles.card}>
            <Text style={commonStyles.cardTitle}>Could not load shift</Text>
            <ErrorMessage message={shiftState.errorMessage} />
            <Pressable style={commonStyles.btnRefresh} onPress={loadCurrentShift}>
              <Text style={commonStyles.btnRefreshText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {/* No active shift */}
        {hasNoActiveShift ? (
          <View style={commonStyles.card}>
            <Text style={commonStyles.cardTitle}>No active shift</Text>
            <Text style={styles.bodyText}>
              You don&apos;t have an active shift right now. Choose a shift type to
              get started.
            </Text>

            {openShiftErrorMessage ? (
            <View style={styles.openShiftErrorContainer}>
              <ErrorMessage message={openShiftErrorMessage} />

              <Pressable
                style={({ pressed }) => [
                  styles.dismissWifiErrorButton,
                  pressed && styles.dismissWifiErrorButtonPressed,
                ]}
                onPress={() => setOpenShiftErrorMessage(null)}
                accessibilityRole="button"
                accessibilityLabel="Dismiss Wi-Fi message"
              >
                <Text style={styles.dismissWifiErrorButtonText}>
                  Got it
                </Text>
              </Pressable>
            </View>
          ) : null}

            <View style={styles.shiftTypeRow}>
              <Pressable
                style={[
                  styles.shiftTypeBtn,
                  openingShiftType !== null && styles.btnDisabled,
                ]}
                onPress={() => void handleOpenShift("DAY")}
                disabled={openingShiftType !== null}
              >
                {openingShiftType === "DAY" ? (
                  <ActivityIndicator size="small" color="#131b2e" />
                ) : (
                  <Text style={styles.shiftTypeBtnText}>Open day shift</Text>
                )}
              </Pressable>
              <Pressable
                style={[
                  styles.shiftTypeBtn,
                  openingShiftType !== null && styles.btnDisabled,
                ]}
                onPress={() => void handleOpenShift("NIGHT")}
                disabled={openingShiftType !== null}
              >
                {openingShiftType === "NIGHT" ? (
                  <ActivityIndicator size="small" color="#131b2e" />
                ) : (
                  <Text style={styles.shiftTypeBtnText}>Open night shift</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Active shift */}
        {activeShift ? (
          <View style={commonStyles.card}>
            {/* Card header row */}
            <View style={styles.cardHeaderRow}>
              <Text style={commonStyles.cardTitle}>Current shift</Text>
              <View
                style={[
                  styles.badge,
                  activeShift.type === "DAY"
                    ? styles.badgeDay
                    : styles.badgeNight,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    activeShift.type === "DAY"
                      ? styles.badgeTextDay
                      : styles.badgeTextNight,
                  ]}
                >
                  {activeShift.type}
                </Text>
              </View>
            </View>

            <Text style={styles.bodyText}>
              Shift started at {formatDateTime(activeShift.openedAt)}
            </Text>

            {/* Summary metrics */}
            <View style={styles.metricsRow}>
              <View>
                <Text style={styles.metricLabel}>Sales</Text>
                <Text style={styles.metricValue}>
                  {activeSalesCount}
                </Text>
              </View>
              <View style={styles.metricRight}>
                <Text style={styles.metricLabel}>Total</Text>
                <Text style={styles.metricValue}>
                  {salesState.status === "loading"
                    ? "�"
                    : formatMoney(shiftTotal)}
                </Text>
              </View>
            </View>

            {/* Sales list */}
            {salesState.status === "loading" ? (
              <ActivityIndicator
                color="#00685f"
                style={{ alignSelf: "center" }}
              />
            ) : null}

            {salesState.status === "error" ? (
              <ErrorMessage message={salesState.errorMessage} />
            ) : null}

            {salesState.status === "ready" &&
            salesState.sales.length === 0 ? (
              <Text style={styles.bodyText}>No sales registered yet.</Text>
            ) : null}

            {salesState.status === "ready" && visibleSales.length > 0 ? (
              <View style={styles.salesList}>
                {visibleSales.map((sale, index) => (
                  <Pressable
                    key={sale.id}
                    style={[
                      styles.saleRow,
                      index === visibleSales.length - 1 &&
                        styles.saleRowLast,
                    ]}
                    onPress={() => router.push(`/(staff)/sales/${sale.id}`)}
                  >
                    <View style={styles.saleLeft}>
                      <Text
                        style={[
                          styles.saleLabel,
                          sale.status === "CANCELLED" && styles.saleLabelCancelled,
                        ]}
                      >
                        {getSaleLabel(sale)}
                      </Text>
                      <View style={styles.paymentChipRow}>
                        <View style={styles.paymentChip}>
                          <Text style={styles.paymentChipText}>
                            {getPaymentLabel(sale)}
                          </Text>
                        </View>
                        {sale.status === "CANCELLED" ? (
                          <View style={styles.cancelledChip}>
                            <Text style={styles.cancelledChipText}>
                              CANCELLED
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.saleAmount,
                        sale.status === "CANCELLED" && styles.saleAmountCancelled,
                      ]}
                    >
                      {formatMoney(sale.finalTotalAmount)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {salesState.status === "ready" && salesState.sales.length > 0 ? (
              <Pressable onPress={() => router.push("/(staff)/sales" as never)}>
                <Text style={styles.viewAllLink}>View all sales</Text>
              </Pressable>
            ) : null}

            {/* Action buttons */}
            <View style={commonStyles.actions}>
              <Pressable
                style={styles.btnPrimary}
                onPress={() => router.push("/(staff)/sales/new-sale")}
              >
                <Text style={styles.btnPrimaryText}>+ New sale</Text>
              </Pressable>

              <Pressable
                style={styles.btnSecondary}
                onPress={() =>
                  router.push({
                    pathname: "/(staff)/close-shift/preview",
                    params: { shiftId: activeShift.id },
                  })
                }
              >
                <Text style={styles.btnSecondaryText}>? Close shift</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Staff actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Staff actions</Text>

          <Pressable
            style={({ pressed }) => [
              styles.quickActionRow,
              pressed && styles.quickActionRowPressed,
            ]}
            onPress={() => router.push("/(staff)/history")}
          >
            <View style={styles.quickActionLeft}>
              <Text style={styles.quickActionIcon}>?</Text>
              <Text style={styles.quickActionText}>My shifts</Text>
            </View>
            <Text style={styles.quickActionChevron}>�</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.quickActionRow,
              pressed && styles.quickActionRowPressed,
            ]}
            onPress={() => router.push("/(staff)/incidents")}
          >
            <View style={styles.quickActionLeft}>
              <Text style={styles.quickActionIcon}>?</Text>
              <Text style={styles.quickActionText}>My incidents</Text>
            </View>
            <Text style={styles.quickActionChevron}>�</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.quickActionRow,
              pressed && styles.quickActionRowPressed,
            ]}
            onPress={loadCurrentShift}
          >
            <View style={styles.quickActionLeft}>
              <Text style={styles.quickActionIcon}>?</Text>
              <Text style={styles.quickActionText}>Refresh</Text>
            </View>
            <Text style={styles.quickActionChevron}>�</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.quickActionRow,
              styles.quickActionRowLast,
              pressed && styles.quickActionRowPressed,
            ]}
            onPress={() => void handleLogout()}
          >
            <View style={styles.quickActionLeft}>
              <Text style={[styles.quickActionIcon, styles.quickActionIconDanger]}>
                ?
              </Text>
              <Text style={[styles.quickActionText, styles.quickActionTextDanger]}>
                Logout
              </Text>
            </View>
            <Text style={[styles.quickActionChevron, styles.quickActionTextDanger]}>
              �
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bodyText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    lineHeight: 20,
  },
  // Badge
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeDay: {
    backgroundColor: "#89f5e7",
  },
  badgeNight: {
    backgroundColor: colors.secondarySoft,
  },
  badgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  badgeTextDay: {
    color: "#00201d",
  },
  badgeTextNight: {
    color: "#001453",
  },
  // Metrics row
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(188,201,198,0.3)",
  },
  metricRight: {
    alignItems: "flex-end",
  },
  metricLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },

  // Sales list
  salesList: {
    gap: 0,
  },
  saleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  saleRowLast: {
    borderBottomWidth: 0,
  },
  saleLeft: {
    flex: 1,
    gap: 4,
  },
  saleLabel: {
    fontSize: fontSize.xl,
    color: colors.text,
  },
  paymentChip: {
    alignSelf: "flex-start",
    backgroundColor: "#e2e7ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paymentChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  saleAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginLeft: 8,
  },
  saleLabelCancelled: {
    color: colors.textMuted,
    opacity: 0.6,
  },
  saleAmountCancelled: {
    color: colors.textMuted,
    opacity: 0.6,
    textDecorationLine: "line-through",
  },
  paymentChipRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  cancelledChip: {
    backgroundColor: "#ffebee",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cancelledChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: "#c62828",
    letterSpacing: 0.3,
  },

  viewAllLink: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    textAlign: "center",
  },

  // Buttons
  btnPrimary: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.extrabold,
    color: colors.surface,
    letterSpacing: 0.3,
  },
  btnSecondary: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  btnDisabled: {
    opacity: 0.5,
  },

  // No active shift buttons
  shiftTypeRow: {
    flexDirection: "row",
    gap: 12,
  },
  shiftTypeBtn: {
    flex: 1,
    height: 44,
    backgroundColor: "#e2e7ff",
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  shiftTypeBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  openShiftErrorContainer: {
    gap: 8,
  },
  dismissWifiErrorButton: {
    alignSelf: "flex-start",
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  dismissWifiErrorButtonPressed: {
    opacity: 0.7,
  },
  dismissWifiErrorButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  // Staff actions card
  quickActionsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  quickActionsTitle: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  quickActionRow: {
    minHeight: 58,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quickActionRowLast: {
    borderBottomWidth: 0,
  },
  quickActionRowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  quickActionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  quickActionIcon: {
    width: 24,
    fontSize: fontSize.lg,
    color: colors.primary,
    textAlign: "center",
  },
  quickActionText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  quickActionChevron: {
    fontSize: 28,
    color: colors.textSubtle,
  },
  quickActionIconDanger: {
    color: colors.danger,
  },
  quickActionTextDanger: {
    color: colors.danger,
  },
});
