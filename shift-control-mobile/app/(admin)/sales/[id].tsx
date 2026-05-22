import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { getSaleById } from "@/src/api/sales";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import type { Sale } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { formatMoney } from "@/src/utils/money";

type SaleDetailState =
  | {
      status: "loading";
      sale: null;
      errorMessage: null;
    }
  | {
      status: "ready";
      sale: Sale;
      errorMessage: null;
    }
  | {
      status: "error";
      sale: null;
      errorMessage: string;
    };

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function AdminSaleDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const saleId = params.id;

  const [state, setState] = useState<SaleDetailState>({
    status: "loading",
    sale: null,
    errorMessage: null,
  });

  const loadSale = useCallback(async () => {
    if (!saleId) {
      setState({
        status: "error",
        sale: null,
        errorMessage: "Sale id is missing.",
      });
      return;
    }

    setState({
      status: "loading",
      sale: null,
      errorMessage: null,
    });

    try {
      const sale = await getSaleById(saleId);

      setState({
        status: "ready",
        sale,
        errorMessage: null,
      });
    } catch (error) {
      setState({
        status: "error",
        sale: null,
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, [saleId]);

  useEffect(() => {
    void loadSale();
  }, [loadSale]);

  if (state.status === "loading") {
    return <LoadingState message="Loading sale..." />;
  }

  if (state.status === "error") {
    return (
      <Screen>
        <View style={styles.container}>
          <Text style={styles.title}>Sale detail</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Could not load sale</Text>
            <ErrorMessage message={state.errorMessage} />
            <Button title="Try again" onPress={loadSale} />
            <Button title="Back" onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  const sale = state.sale;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Sale detail</Text>
          <Text style={styles.subtitle}>Sale {sale.id.slice(0, 8)}</Text>
        </View>

        <View
          style={
            sale.status === "ACTIVE" ? styles.successCard : styles.warningCard
          }
        >
          <Text
            style={
              sale.status === "ACTIVE"
                ? styles.successTitle
                : styles.warningTitle
            }
          >
            {sale.status === "ACTIVE" ? "Active sale" : "Cancelled sale"}
          </Text>
          <Text
            style={
              sale.status === "ACTIVE"
                ? styles.successText
                : styles.warningText
            }
          >
            {sale.status === "ACTIVE"
              ? "This sale is active and included in operational totals."
              : "This sale has been cancelled and is excluded from active totals."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary</Text>

          <DetailRow label="Status" value={sale.status} />
          <DetailRow label="Invoice" value={sale.invoiceStatus} />
          <DetailRow label="Subtotal" value={formatMoney(sale.subtotalAmount)} />
          <DetailRow
            label="Discount"
            value={formatMoney(sale.discountTotalAmount)}
          />
          <DetailRow label="Total" value={formatMoney(sale.finalTotalAmount)} />
          <DetailRow
            label="Created at"
            value={formatDateTime(sale.createdAt)}
          />
          <DetailRow
            label="Updated at"
            value={formatDateTime(sale.updatedAt)}
          />

          {sale.cancelledAt ? (
            <DetailRow
              label="Cancelled at"
              value={formatDateTime(sale.cancelledAt)}
            />
          ) : null}

          {sale.cancelledReason ? (
            <DetailRow label="Cancel reason" value={sale.cancelledReason} />
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items</Text>

          {sale.items.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{item.productName}</Text>
                <Text style={styles.rowMeta}>
                  {item.quantity} × {formatMoney(item.unitPrice)}
                </Text>
              </View>

              <Text style={styles.rowAmount}>{formatMoney(item.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Discounts</Text>

          {sale.discounts.length === 0 ? (
            <Text style={styles.body}>No discounts applied.</Text>
          ) : (
            sale.discounts.map((discount) => (
              <View key={discount.id} style={styles.row}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{discount.reason}</Text>
                  <Text style={styles.rowMeta}>
                    {discount.type} · Value {formatMoney(discount.value)}
                  </Text>
                  {discount.note ? (
                    <Text style={styles.rowMeta}>{discount.note}</Text>
                  ) : null}
                </View>

                <Text style={styles.rowAmount}>
                  -{formatMoney(discount.amountApplied)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payments</Text>

          {sale.payments.map((payment) => (
            <View key={payment.id} style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{payment.method}</Text>
              </View>

              <Text style={styles.rowAmount}>{formatMoney(payment.amount)}</Text>
            </View>
          ))}
        </View>

        {sale.note ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Note</Text>
            <Text style={styles.body}>{sale.note}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button title="Refresh" onPress={loadSale} />
          <Button title="Back" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    padding: 24,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    color: "#555555",
    lineHeight: 22,
  },
  card: {
    gap: 12,
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  detailLabel: {
    flex: 1,
    fontSize: 16,
    color: "#555555",
  },
  detailValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  rowMain: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  rowMeta: {
    fontSize: 14,
    color: "#666666",
  },
  rowAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  successCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#9bd49b",
    borderRadius: 16,
    padding: 20,
    backgroundColor: "#edf9ed",
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f6b1f",
  },
  successText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1f6b1f",
  },
  warningCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#f0d28a",
    borderRadius: 16,
    padding: 20,
    backgroundColor: "#fff8e5",
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#7a5200",
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#7a5200",
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
});