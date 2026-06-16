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
import {
  getShiftById,
  getShiftClosureByShiftId,
} from "@/src/api/shifts";
import { listSalesByShiftId } from "@/src/api/sales";
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type {
  Sale,
  SaleStatus,
  InvoiceStatus,
  Shift,
  ShiftClosure,
  ShiftClosureStatus,
} from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { formatMoney } from "@/src/utils/money";
import { colors, fontWeight, fontSize, shadows, radius } from "@/src/theme";

import { shareShiftClosureSummary } from "@/src/features/closures/shareShiftClosureSummary";

function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const bg = status === "ACTIVE" ? "#d2f5f0" : "#e8ecf0";
  const color = status === "ACTIVE" ? "#004f49" : "#4d5b5a";
  return (
    <Text style={[styles.saleBadge, { backgroundColor: bg, color }]}>
      {status}
    </Text>
  );
}

function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  const bg = status === "INVOICED" ? "#e8eeff" : "#fff3d6";
  const color = status === "INVOICED" ? "#3755c3" : "#825100";
  return (
    <Text style={[styles.saleBadge, { backgroundColor: bg, color }]}>
      {status}
    </Text>
  );
}

function getBannerStyle(shift: Shift, closureStatus: ShiftClosureStatus | null) {
  if (shift.status === "OPEN") return styles.bannerOpen;
  if (closureStatus === "CLOSED_WITH_INCIDENT") return styles.bannerWarning;
  return styles.bannerClosed;
}

function getBannerTextStyle(shift: Shift, closureStatus: ShiftClosureStatus | null) {
  if (shift.status === "OPEN") return styles.bannerOpenText;
  if (closureStatus === "CLOSED_WITH_INCIDENT") return styles.bannerWarningText;
  return styles.bannerClosedText;
}

function getBannerLabel(shift: Shift, closureStatus: ShiftClosureStatus | null) {
  if (shift.status === "OPEN") return "OPEN SHIFT";
  if (closureStatus === "CLOSED_WITH_INCIDENT") return "CLOSED SHIFT · INCIDENT";
  return "CLOSED SHIFT";
}

type ShiftHistoryDetailState =
  | {
      status: "loading";
      shift: null;
      closure: null;
      sales: Sale[];
      errorMessage: null;
    }
  | {
      status: "ready";
      shift: Shift;
      closure: ShiftClosure | null;
      sales: Sale[];
      errorMessage: null;
    }
  | {
      status: "error";
      shift: null;
      closure: null;
      sales: Sale[];
      errorMessage: string;
    };

function getBaseCashAmount(closure: ShiftClosure): number {
  return closure.expectedPhysicalCash - closure.cashToWithdraw;
}

export default function ShiftHistoryDetailScreen() {
  const params = useLocalSearchParams<{ shiftId?: string }>();
  const shiftId = params.shiftId;

  const [state, setState] = useState<ShiftHistoryDetailState>({
    status: "loading",
    shift: null,
    closure: null,
    sales: [],
    errorMessage: null,
  });

  const [isSharing, setIsSharing] = useState(false);
  const [shareErrorMessage, setShareErrorMessage] = useState<string | null>(null);

  const loadShiftHistory = useCallback(async () => {
    if (!shiftId) {
      setState({
        status: "error",
        shift: null,
        closure: null,
        sales: [],
        errorMessage: "Shift id is missing.",
      });
      return;
    }

    setState({
      status: "loading",
      shift: null,
      closure: null,
      sales: [],
      errorMessage: null,
    });

    try {
      const shift = await getShiftById(shiftId);
      const sales = await listSalesByShiftId(shiftId);

      let closure: ShiftClosure | null = null;

      if (shift.status === "CLOSED") {
        try {
          closure = await getShiftClosureByShiftId(shiftId);
        } catch {
          closure = null;
        }
      }

      setState({
        status: "ready",
        shift,
        closure,
        sales,
        errorMessage: null,
      });
    } catch (error) {
      setState({
        status: "error",
        shift: null,
        closure: null,
        sales: [],
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, [shiftId]);

  useEffect(() => {
    void loadShiftHistory();
  }, [loadShiftHistory]);

  async function handleShareClosure() {
    if (state.status !== "ready" || state.closure === null || isSharing) {
      return;
    }

    setIsSharing(true);
    setShareErrorMessage(null);

    try {
      await shareShiftClosureSummary({
        shift: state.shift,
        closure: state.closure,
      });
    } catch {
      setShareErrorMessage("Could not open share options.");
    } finally {
      setIsSharing(false);
    }
  }

  if (state.status === "loading") {
    return <LoadingState message="Loading shift history..." />;
  }

  if (state.status === "error") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppTopBar variant="back" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ErrorMessage message={state.errorMessage} />
          <Pressable style={styles.btnOutline} onPress={loadShiftHistory}>
            <Text style={styles.btnOutlineText}>Try again</Text>
          </Pressable>
          <Pressable style={styles.btnBack} onPress={() => router.back()}>
            <Text style={styles.btnBackText}>← Back</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { shift, closure, sales } = state;
  const closureStatus = closure?.status ?? null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppTopBar variant="back" />

      {/* Status banner */}
      <View style={[styles.banner, getBannerStyle(shift, closureStatus)]}>
        <Text style={[styles.bannerText, getBannerTextStyle(shift, closureStatus)]}>
          {getBannerLabel(shift, closureStatus)}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Short ID */}
        <Text style={styles.shortId}>
          #{shift.id.slice(0, 8).toUpperCase()}
        </Text>

        {/* Shift info card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>SHIFT</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValue}>{shift.type}</Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>{shift.status}</Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Staff name</Text>
            <Text style={styles.infoValue}>{shift.staffName || "Staff"}</Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Store name</Text>
            <Text style={styles.infoValue}>{shift.storeName || "Store"}</Text>
          </View>
          <View style={styles.rowDividerStrong} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Opened at</Text>
            <Text style={styles.infoValue}>{formatDateTime(shift.openedAt)}</Text>
          </View>
          {shift.closedAt ? (
            <>
              <View style={styles.rowDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Closed at</Text>
                <Text style={styles.infoValue}>{formatDateTime(shift.closedAt)}</Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Closure totals card */}
        {closure ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>CLOSURE TOTALS</Text>

              {/* Total sales — prominent */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total sales amount</Text>
                <Text style={styles.totalSalesValue}>
                  {formatMoney(closure.totalSales)}
                </Text>
              </View>

              <View style={styles.rowDividerStrong} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cash total</Text>
                <Text style={styles.infoValue}>{formatMoney(closure.totalCash)}</Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>MB total</Text>
                <Text style={styles.infoValue}>{formatMoney(closure.totalMb)}</Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Glovo online total</Text>
                <Text style={styles.infoValue}>{formatMoney(closure.totalGlovoOnline)}</Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Glovo cash total</Text>
                <Text style={styles.infoValue}>{formatMoney(closure.totalGlovoCash)}</Text>
              </View>

              <View style={styles.rowDividerStrong} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cash to withdraw</Text>
                <Text style={styles.infoValueBold}>{formatMoney(closure.cashToWithdraw)}</Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Expected physical cash</Text>
                <Text style={styles.infoValueBold}>{formatMoney(closure.expectedPhysicalCash)}</Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Base cash amount</Text>
                <Text style={styles.infoValue}>{formatMoney(getBaseCashAmount(closure))}</Text>
              </View>

              <View style={styles.rowDividerStrong} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Confirmed cash</Text>
                <Text style={styles.infoValue}>{formatMoney(closure.confirmedCashAmount)}</Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Confirmed MB</Text>
                <Text style={styles.infoValue}>{formatMoney(closure.confirmedMbAmount)}</Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cash difference</Text>
                <Text
                  style={[
                    styles.infoValue,
                    closure.cashDifference !== 0 && styles.differenceAlert,
                  ]}
                >
                  {formatMoney(closure.cashDifference)}
                </Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>MB difference</Text>
                <Text
                  style={[
                    styles.infoValue,
                    closure.mbDifference !== 0 && styles.differenceAlert,
                  ]}
                >
                  {formatMoney(closure.mbDifference)}
                </Text>
              </View>
            </View>

            {closure.note ? (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>CLOSURE NOTE</Text>
                <Text style={styles.noteText}>{closure.note}</Text>
              </View>
            ) : null}
          </>
        ) : shift.status === "CLOSED" ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>CLOSURE TOTALS</Text>
            <Text style={styles.emptyText}>
              This shift is closed, but its closure data could not be loaded.
            </Text>
          </View>
        ) : null}

        {/* Sales list card */}
        <View style={styles.salesCard}>
          <View style={styles.salesCardHeader}>
            <Text style={styles.cardLabel}>SALES</Text>
            <Text style={styles.salesCount}>{sales.length}</Text>
          </View>

          {sales.length === 0 ? (
            <Text style={styles.emptyText}>
              No sales registered for this shift.
            </Text>
          ) : (
            sales.map((sale, index) => (
              <View key={sale.id}>
                {index > 0 && <View style={styles.saleRowDivider} />}
                <Pressable
                  style={({ pressed }) => [
                    styles.saleRow,
                    pressed && styles.saleRowPressed,
                  ]}
                  onPress={() => router.push(`/(staff)/sales/${sale.id}` as never)}
                >
                  <View style={styles.saleMain}>
                    <Text style={styles.saleShortId}>
                      #{sale.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <View style={styles.saleBadgeRow}>
                      <SaleStatusBadge status={sale.status} />
                      <InvoiceBadge status={sale.invoiceStatus} />
                    </View>
                  </View>
                  <View style={styles.saleRight}>
                    <Text style={styles.saleTotalAmount}>
                      {formatMoney(sale.finalTotalAmount)}
                    </Text>
                    <Text style={styles.saleChevron}>›</Text>
                  </View>
                </Pressable>
              </View>
            ))
          )}
        </View>

        {shareErrorMessage ? (
          <View style={styles.shareErrorCard}>
            <ErrorMessage message={shareErrorMessage} />
          </View>
        ) : null}

        {/* Bottom actions */}
        <View style={styles.actions}>
          {closure ? (
              <Pressable
                style={({ pressed }) => [
                  styles.btnOutline,
                  isSharing && styles.btnDisabled,
                  pressed && !isSharing && styles.btnPressed,
                ]}
                onPress={handleShareClosure}
                disabled={isSharing}
              >
                <Text style={styles.btnOutlineText}>
                  {isSharing ? "Opening share options…" : "Share close summary"}
                </Text>
              </Pressable>
            ) : null}

          <Pressable
            style={({ pressed }) => [styles.btnIncidents, pressed && styles.btnPressed]}
            onPress={() =>
              router.push({
                pathname: "/(staff)/incidents/new-incident" as never,
                params: { shiftId },
              })
            }
          >
            <Text style={styles.btnIncidentsText}>⚠  Report incident</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btnRefresh, pressed && styles.btnPressed]}
            onPress={loadShiftHistory}
          >
            <Text style={styles.btnRefreshText}>⟳  Refresh</Text>
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

  // Status banner
  banner: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerClosed: {
    backgroundColor: colors.primary,
  },
  bannerClosedText: {
    color: colors.surface,
  },
  bannerOpen: {
    backgroundColor: colors.secondary,
  },
  bannerOpenText: {
    color: colors.surface,
  },
  bannerWarning: {
    backgroundColor: "#fff3d6",
  },
  bannerWarningText: {
    color: colors.warning,
  },
  bannerText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.2,
  },

  // Scroll
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  // Short ID
  shortId: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
    marginBottom: 4,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
    ...shadows.card,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },

  // Info rows
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  infoLabel: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    flex: 1,
  },
  infoValue: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: fontWeight.medium,
    textAlign: "right",
  },
  infoValueBold: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: fontWeight.bold,
    textAlign: "right",
  },
  totalSalesValue: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  differenceAlert: {
    color: colors.danger,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },
  rowDividerStrong: {
    height: 1,
    backgroundColor: "#d8e0dd",
    marginVertical: 2,
  },

  // Note
  noteText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    paddingVertical: 4,
  },

  // Sales card
  salesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.card,
    padding: 16,
    gap: 8,
  },
  salesCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  salesCount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },

  // Sale row
  saleRowDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginHorizontal: 0,
  },
  saleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    gap: 12,
  },
  saleRowPressed: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
  },
  saleMain: {
    flex: 1,
    gap: 6,
  },
  saleShortId: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  saleBadgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  saleBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  saleRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  saleTotalAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  saleChevron: {
    fontSize: fontSize.xxl,
    color: colors.textSubtle,
    fontWeight: fontWeight.regular,
  },

  // Actions
  actions: {
    gap: 10,
    marginTop: 4,
  },
  btnIncidents: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnIncidentsText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.surface,
    letterSpacing: 0.3,
  },
  btnRefresh: {
    height: 48,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRefreshText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.secondary,
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
  },
  btnOutlineText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  btnPressed: {
    opacity: 0.8,
  },

  shareErrorCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
    backgroundColor: "#fff8f7",
    padding: 14,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});