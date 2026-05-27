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
import { colors, fontWeight, fontSize, shadows, radius } from "@/src/theme";
import { LoadingState } from "@/src/components/LoadingState";
import type { Sale, ShiftType } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { formatMoney } from "@/src/utils/money";

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
  if (sale.payments.length === 0) return "—";
  if (sale.payments.length === 1) return sale.payments[0].method;
  return "SPLIT";
}

function getSaleLabel(sale: Sale): string {
  return sale.items[0]?.productName ?? `Sale ${sale.id.slice(0, 8)}`;
}

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
  const shiftTotal = salesState.sales.reduce(
    (sum, s) => sum + s.finalTotalAmount,
    0
  );

  async function handleOpenShift(type: ShiftType) {
    if (openingShiftType) return;
    setOpeningShiftType(type);
    setOpenShiftErrorMessage(null);
    try {
      await openShift({ type });
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
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

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
          <Text style={styles.pageTitle}>Staff home</Text>
          <Text style={styles.pageSubtitle}>Welcome, {displayName}</Text>
        </View>

        {/* Error loading shift */}
        {shiftState.status === "error" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Could not load shift</Text>
            <ErrorMessage message={shiftState.errorMessage} />
            <Pressable style={styles.refreshBtn} onPress={loadCurrentShift}>
              <Text style={styles.refreshBtnText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {/* No active shift */}
        {hasNoActiveShift ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No active shift</Text>
            <Text style={styles.bodyText}>
              You don't have an active shift right now. Choose a shift type to
              get started.
            </Text>

            <ErrorMessage message={openShiftErrorMessage} />

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
          <View style={styles.card}>
            {/* Card header row */}
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Current shift</Text>
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
                  {salesState.sales.length}
                </Text>
              </View>
              <View style={styles.metricRight}>
                <Text style={styles.metricLabel}>Total</Text>
                <Text style={styles.metricValue}>
                  {salesState.status === "loading"
                    ? "…"
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
                      <Text style={styles.saleLabel}>
                        {getSaleLabel(sale)}
                      </Text>
                      <View style={styles.paymentChip}>
                        <Text style={styles.paymentChipText}>
                          {getPaymentLabel(sale)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.saleAmount}>
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
            <View style={styles.actions}>
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
                <Text style={styles.btnSecondaryText}>⊠ Close shift</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Footer actions */}
        <View style={styles.footer}>
          <Pressable
            style={styles.footerLink}
            onPress={() => router.push("/(staff)/history")}
          >
            <Text style={styles.footerLinkText}>My shifts</Text>
          </Pressable>

          <Pressable
            style={styles.footerLink}
            onPress={() => router.push("/(staff)/incidents")}
          >
            <Text style={styles.footerLinkText}>My incidents</Text>
          </Pressable>

          <Pressable style={styles.footerLink} onPress={loadCurrentShift}>
            <Text style={styles.footerLinkText}>↻ Refresh</Text>
          </Pressable>

          <Pressable
            style={styles.footerLink}
            onPress={() => void handleLogout()}
          >
            <Text style={[styles.footerLinkText, styles.logoutText]}>
              ⎋ Logout
            </Text>
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

  // AppBar
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
    gap: 16,
  },
  menuIcon: {
    fontSize: 20,
    color: colors.primary,
  },
  appBarTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
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
    fontWeight: fontWeight.bold,
    color: colors.secondaryDark,
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
    marginTop: 8,
  },
  pageTitle: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 16,
    gap: 16,
    ...shadows.card,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
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

  bodyText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    lineHeight: 20,
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

  viewAllLink: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    textAlign: "center",
  },

  // Buttons
  actions: {
    gap: 10,
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

  // Refresh/error button
  refreshBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  refreshBtnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },

  // Footer
  footer: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
  },
  footerLink: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  footerLinkText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  logoutText: {
    color: colors.danger,
  },


});
