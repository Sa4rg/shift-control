import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { listCurrentShiftSales } from "@/src/api/sales";
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type { Sale } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { formatMoney } from "@/src/utils/money";

type SalesState =
  | {
      status: "loading";
      sales: Sale[];
      errorMessage: null;
    }
  | {
      status: "ready";
      sales: Sale[];
      errorMessage: null;
    }
  | {
      status: "error";
      sales: Sale[];
      errorMessage: string;
    };

export default function SalesIndexScreen() {
  const { user } = useAuth();
  const [state, setState] = useState<SalesState>({
    status: "loading",
    sales: [],
    errorMessage: null,
  });

  const loadSales = useCallback(async () => {
    setState({
      status: "loading",
      sales: [],
      errorMessage: null,
    });

    try {
      const sales = await listCurrentShiftSales();

      setState({
        status: "ready",
        sales,
        errorMessage: null,
      });
    } catch (error) {
      setState({
        status: "error",
        sales: [],
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSales();
    }, [loadSales])
  );

  if (state.status === "loading") {
    return <LoadingState message="Loading sales..." />;
  }

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
          <Text style={styles.pageTitle}>Current shift sales</Text>
          <Text style={styles.pageSubtitle}>
            Sales registered during the current open shift.
          </Text>
        </View>

        {/* Error state */}
        {state.status === "error" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Could not load sales</Text>
            <ErrorMessage message={state.errorMessage} />
            <Pressable style={styles.retryBtn} onPress={loadSales}>
              <Text style={styles.retryBtnText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Empty state */}
        {state.status === "ready" && state.sales.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No sales yet</Text>
            <Text style={styles.bodyText}>
              Create the first sale for this shift.
            </Text>
            <Pressable
              style={styles.btnPrimary}
              onPress={() => router.push("/(staff)/sales/new-sale")}
            >
              <Text style={styles.btnPrimaryText}>+ New sale</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Sales list */}
        {state.status === "ready" && state.sales.length > 0 ? (
          <View style={styles.salesCard}>
            {state.sales.map((sale, index) => (
              <Pressable
                key={sale.id}
                style={[
                  styles.saleRow,
                  index === state.sales.length - 1 && styles.saleRowLast,
                ]}
                onPress={() => router.push(`/(staff)/sales/${sale.id}`)}
              >
                <View style={styles.saleLeft}>
                  <View style={styles.saleTopRow}>
                    <Text style={styles.saleId}>
                      #{sale.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <SaleStatusBadge status={sale.status} />
                    <InvoiceStatusBadge status={sale.invoiceStatus} />
                  </View>
                  <Text style={styles.saleDate}>
                    {formatDateTime(sale.createdAt)}
                  </Text>
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

        {/* Bottom actions */}
        {state.status === "ready" ? (
          <View style={styles.actions}>
            <Pressable
              style={styles.btnPrimary}
              onPress={() => router.push("/(staff)/sales/new-sale")}
            >
              <Text style={styles.btnPrimaryText}>+ New sale</Text>
            </Pressable>
            <Pressable style={styles.btnSecondary} onPress={() => router.back()}>
              <Text style={styles.btnSecondaryText}>Back</Text>
            </Pressable>
          </View>
        ) : null}

        {state.status === "error" ? (
          <View style={styles.actions}>
            <Pressable style={styles.btnSecondary} onPress={() => router.back()}>
              <Text style={styles.btnSecondaryText}>Back</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SaleStatusBadge({ status }: { status: Sale["status"] }) {
  const badgeStyle =
    status === "ACTIVE" ? styles.badgeActive : styles.badgeCancelled;
  const textStyle =
    status === "ACTIVE" ? styles.badgeActiveText : styles.badgeCancelledText;
  return (
    <View style={[styles.badge, badgeStyle]}>
      <Text style={[styles.badgeText, textStyle]}>{status}</Text>
    </View>
  );
}

function InvoiceStatusBadge({ status }: { status: Sale["invoiceStatus"] }) {
  const badgeStyle =
    status === "INVOICED" ? styles.badgeInvoiced : styles.badgePending;
  const textStyle =
    status === "INVOICED"
      ? styles.badgeInvoicedText
      : styles.badgePendingText;
  return (
    <View style={[styles.badge, badgeStyle]}>
      <Text style={[styles.badgeText, textStyle]}>{status}</Text>
    </View>
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
    marginTop: 8,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#131b2e",
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 16,
    color: "#3d4947",
    lineHeight: 24,
  },

  // Card (generic)
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bcc9c6",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#131b2e",
  },
  bodyText: {
    fontSize: 14,
    color: "#3d4947",
    lineHeight: 20,
  },

  // Sales card (no inner padding — rows have their own padding)
  salesCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bcc9c6",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  // Sale row
  saleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#bcc9c6",
  },
  saleRowLast: {
    borderBottomWidth: 0,
  },
  saleLeft: {
    flex: 1,
    gap: 4,
    marginRight: 12,
  },
  saleTopRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  saleId: {
    fontSize: 14,
    fontWeight: "600",
    color: "#131b2e",
    fontVariant: ["tabular-nums"],
  },
  saleDate: {
    fontSize: 12,
    fontWeight: "500",
    color: "#3d4947",
  },
  saleAmount: {
    fontSize: 20,
    fontWeight: "600",
    color: "#131b2e",
  },
  saleAmountCancelled: {
    color: "#6d7a77",
    textDecorationLine: "line-through",
    opacity: 0.6,
  } as TextStyle,

  // Status badges
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  badgeActive: {
    backgroundColor: "rgba(0,104,95,0.1)",
  },
  badgeActiveText: {
    color: "#00685f",
  },
  badgeCancelled: {
    backgroundColor: "rgba(61,73,71,0.1)",
  },
  badgeCancelledText: {
    color: "#3d4947",
  },
  badgePending: {
    backgroundColor: "rgba(163,103,0,0.1)",
  },
  badgePendingText: {
    color: "#825100",
  },
  badgeInvoiced: {
    backgroundColor: "rgba(112,140,253,0.1)",
  },
  badgeInvoicedText: {
    color: "#3755c3",
  },

  // Buttons
  actions: {
    gap: 10,
  },
  btnPrimary: {
    height: 48,
    backgroundColor: "#00685f",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00685f",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  btnSecondary: {
    height: 48,
    backgroundColor: "#e2e7ff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#131b2e",
  },

  // Retry button
  retryBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f2f3ff",
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3d4947",
  },
});