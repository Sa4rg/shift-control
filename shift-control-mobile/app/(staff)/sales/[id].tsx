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

function formatMoney(value: number): string {
  return `€${value.toFixed(2)}`;
}

export default function SaleDetailScreen() {
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary</Text>
          <Text style={styles.body}>Status: {sale.status}</Text>
          <Text style={styles.body}>Invoice: {sale.invoiceStatus}</Text>
          <Text style={styles.body}>Subtotal: {formatMoney(sale.subtotalAmount)}</Text>
          <Text style={styles.body}>
            Discount: {formatMoney(sale.discountTotalAmount)}
          </Text>
          <Text style={styles.total}>Total: {formatMoney(sale.finalTotalAmount)}</Text>
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
  total: {
    fontSize: 18,
    fontWeight: "700",
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
  actions: {
    gap: 12,
  },
});