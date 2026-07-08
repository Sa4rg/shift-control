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
import { listSalesByShiftId } from "@/src/api/sales";
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type { InvoiceStatus, Sale, SaleStatus } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { formatMoney } from "@/src/utils/money";
import { colors, commonStyles, fontWeight, fontSize, radius } from "@/src/theme";

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

function formatShortId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const isActive = status === "ACTIVE";

  return (
    <View
      style={[
        styles.saleBadge,
        isActive ? styles.saleBadgeActive : styles.saleBadgeCancelled,
      ]}
    >
      <Text
        style={[
          styles.saleBadgeText,
          isActive ? styles.saleBadgeTextActive : styles.saleBadgeTextCancelled,
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  const isInvoiced = status === "INVOICED";

  return (
    <View
      style={[
        styles.saleBadge,
        isInvoiced ? styles.invoiceBadgeInvoiced : styles.invoiceBadgePending,
      ]}
    >
      <Text
        style={[
          styles.saleBadgeText,
          isInvoiced
            ? styles.invoiceBadgeTextInvoiced
            : styles.invoiceBadgeTextPending,
        ]}
      >
        {isInvoiced ? "INVOICE: YES" : "INVOICE: NO"}
      </Text>
    </View>
  );
}

function SaleRow({ sale, isLast }: { sale: Sale; isLast: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.saleRow,
        isLast && styles.saleRowLast,
        pressed && styles.rowPressed,
      ]}
      onPress={() => router.push(`/(admin)/sales/${sale.id}`)}
    >
      <View style={styles.saleMain}>
        <Text style={styles.saleTitle}>{formatShortId(sale.id)}</Text>

        <View style={styles.saleBadges}>
          <SaleStatusBadge status={sale.status} />
          <InvoiceBadge status={sale.invoiceStatus} />
        </View>

        <Text style={styles.saleDate}>{formatDateTime(sale.createdAt)}</Text>
      </View>

      <Text
        style={[
          styles.saleTotal,
          sale.status === "CANCELLED" && styles.saleTotalCancelled,
        ]}
      >
        {formatMoney(sale.finalTotalAmount)}
      </Text>
    </Pressable>
  );
}

export default function AdminSalesListScreen() {
  const params = useLocalSearchParams<{ shiftId?: string }>();
  const shiftId = params.shiftId;

  const [state, setState] = useState<SalesState>({
    status: "loading",
    sales: [],
    errorMessage: null,
  });

  const loadSales = useCallback(async () => {
    if (!shiftId) {
      setState({
        status: "error",
        sales: [],
        errorMessage: "Shift ID is missing.",
      });
      return;
    }

    setState({
      status: "loading",
      sales: [],
      errorMessage: null,
    });

    try {
      const sales = await listSalesByShiftId(shiftId);

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
  }, [shiftId]);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  if (state.status === "loading") {
    return <LoadingState message="Loading sales..." />;
  }

  const appBar = <AppTopBar variant="back" />;

  if (state.status === "error") {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        {appBar}

        <ScrollView
          contentContainerStyle={commonStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={commonStyles.card}>
            <View style={commonStyles.cardHeader}>
              <Text style={commonStyles.cardTitle}>Could not load sales</Text>
            </View>

            <View style={commonStyles.cardBody}>
              <ErrorMessage message={state.errorMessage} />

              <Pressable
                style={({ pressed }) => [
                  commonStyles.outlineButton,
                  pressed && commonStyles.buttonPressed,
                ]}
                onPress={loadSales}
              >
                <Text style={commonStyles.outlineButtonText}>Try again</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  commonStyles.btnBack,
                  pressed && commonStyles.buttonPressed,
                ]}
                onPress={() => router.back()}
              >
                <Text style={commonStyles.btnBackText}>← Back</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { sales } = state;

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      {appBar}

      <ScrollView
        contentContainerStyle={commonStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={commonStyles.pageHeader}>
          <Text style={commonStyles.pageTitle}>Shift transactions</Text>
          <Text style={commonStyles.pageSubtitle}>
            All sales registered during this shift
          </Text>
          <View style={styles.salesCountPill}>
            <Text style={styles.salesCountText}>
              {sales.length} {sales.length === 1 ? "Transaction" : "Transactions"}
            </Text>
          </View>
        </View>

        {sales.length === 0 ? (
          <View style={commonStyles.card}>
            <View style={commonStyles.cardBody}>
              <Text style={styles.emptyText}>
                No sales registered for this shift.
              </Text>
            </View>
          </View>
        ) : (
          <View style={commonStyles.card}>
            <View style={styles.salesList}>
              {sales.map((sale, index) => (
                <SaleRow key={sale.id} sale={sale} isLast={index === sales.length - 1} />
              ))}
            </View>
          </View>
        )}

        <View style={commonStyles.actions}>
          <Pressable
            style={({ pressed }) => [
              commonStyles.btnRefresh,
              pressed && commonStyles.buttonPressed,
            ]}
            onPress={loadSales}
          >
            <Text style={commonStyles.btnRefreshText}>⟳ Refresh</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              commonStyles.btnBack,
              pressed && commonStyles.buttonPressed,
            ]}
            onPress={() => router.back()}
          >
            <Text style={commonStyles.btnBackText}>← Back</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  salesCountPill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.secondarySoft,
    marginTop: 4,
  },
  salesCountText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  emptyText: {
    fontSize: fontSize.lg,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
  },
  salesList: {
    backgroundColor: colors.surface,
  },
  saleRow: {
    minHeight: 78,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  saleRowLast: {
    borderBottomWidth: 0,
  },
  saleMain: {
    flex: 1,
    gap: 6,
  },
  saleTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  saleBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  saleBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  saleBadgeActive: {
    backgroundColor: colors.primaryMuted,
  },
  saleBadgeCancelled: {
    backgroundColor: "#dae2fd",
  },
  saleBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  saleBadgeTextActive: {
    color: colors.primaryDark,
  },
  saleBadgeTextCancelled: {
    color: colors.textMuted,
  },
  invoiceBadgeInvoiced: {
    backgroundColor: colors.secondarySoft,
  },
  invoiceBadgePending: {
    backgroundColor: colors.surfaceMuted,
  },
  invoiceBadgeTextInvoiced: {
    color: "#173bab",
  },
  invoiceBadgeTextPending: {
    color: colors.textMuted,
  },
  saleDate: {
    fontSize: fontSize.sm,
    color: colors.textSubtle,
  },
  saleTotal: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  saleTotalCancelled: {
    color: colors.textSubtle,
    textDecorationLine: "line-through",
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
});
