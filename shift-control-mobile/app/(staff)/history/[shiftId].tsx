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
import { useAuth } from "@/src/auth/AuthContext";
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
  const { user } = useAuth();
  const params = useLocalSearchParams<{ shiftId?: string }>();
  const shiftId = params.shiftId;

  const [state, setState] = useState<ShiftHistoryDetailState>({
    status: "loading",
    shift: null,
    closure: null,
    sales: [],
    errorMessage: null,
  });

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

  if (state.status === "loading") {
    return <LoadingState message="Loading shift history..." />;
  }

  const displayName = user?.fullName ?? user?.username ?? "Staff";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (state.status === "error") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.appBar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <Text style={styles.appBarTitle}>Shift detail</Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
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
      {/* AppBar */}
      <View style={styles.appBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.appBarTitle}>Shift detail</Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

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

        {/* Bottom actions */}
        <View style={styles.actions}>
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontSize: 22,
    color: "#00685f",
    fontWeight: "600",
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#131b2e",
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

  // Status banner
  banner: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerClosed: {
    backgroundColor: "#00685f",
  },
  bannerClosedText: {
    color: "#ffffff",
  },
  bannerOpen: {
    backgroundColor: "#3755c3",
  },
  bannerOpenText: {
    color: "#ffffff",
  },
  bannerWarning: {
    backgroundColor: "#fff3d6",
  },
  bannerWarningText: {
    color: "#825100",
  },
  bannerText: {
    fontSize: 12,
    fontWeight: "700",
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
    fontSize: 13,
    color: "#3d4947",
    fontWeight: "500",
    marginBottom: 4,
  },

  // Card
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3d4947",
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
    fontSize: 14,
    color: "#3d4947",
    flex: 1,
  },
  infoValue: {
    fontSize: 15,
    color: "#131b2e",
    fontWeight: "500",
    textAlign: "right",
  },
  infoValueBold: {
    fontSize: 15,
    color: "#131b2e",
    fontWeight: "700",
    textAlign: "right",
  },
  totalSalesValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#00685f",
  },
  differenceAlert: {
    color: "#ba1a1a",
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
    fontSize: 14,
    color: "#3d4947",
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#3d4947",
    paddingVertical: 4,
  },

  // Sales card
  salesCard: {
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
    fontSize: 13,
    fontWeight: "700",
    color: "#3d4947",
    backgroundColor: "#f2f3ff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
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
    backgroundColor: "#f2f3ff",
    borderRadius: 8,
  },
  saleMain: {
    flex: 1,
    gap: 6,
  },
  saleShortId: {
    fontSize: 14,
    fontWeight: "600",
    color: "#131b2e",
  },
  saleBadgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  saleBadge: {
    fontSize: 10,
    fontWeight: "700",
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
    fontSize: 15,
    fontWeight: "700",
    color: "#131b2e",
  },
  saleChevron: {
    fontSize: 18,
    color: "#6d7a77",
    fontWeight: "400",
  },

  // Actions
  actions: {
    gap: 10,
    marginTop: 4,
  },
  btnIncidents: {
    height: 48,
    backgroundColor: "#00685f",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnIncidentsText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  btnRefresh: {
    height: 48,
    backgroundColor: "#f2f3ff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRefreshText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3755c3",
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