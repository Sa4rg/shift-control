import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { listCurrentShiftSales } from "@/src/api/sales";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
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

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Current shift sales</Text>
          <Text style={styles.subtitle}>
            Sales registered during the current open shift.
          </Text>
        </View>

        {state.status === "error" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Could not load sales</Text>
            <ErrorMessage message={state.errorMessage} />
            <Button title="Try again" onPress={loadSales} />
          </View>
        ) : null}

        {state.status === "ready" && state.sales.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No sales yet</Text>
            <Text style={styles.body}>
              No sales have been registered for this shift.
            </Text>
          </View>
        ) : null}

        {state.status === "ready" && state.sales.length > 0 ? (
          <View style={styles.card}>
            {state.sales.map((sale) => (
              <Pressable
                key={sale.id}
                style={styles.saleRow}
                onPress={() => router.push(`/(staff)/sales/${sale.id}`)}
              >
                <View style={styles.saleMain}>
                  <Text style={styles.saleTitle}>Sale {sale.id.slice(0, 8)}</Text>
                  <Text style={styles.saleMeta}>
                    {sale.status} · {sale.invoiceStatus}
                  </Text>
                  <Text style={styles.saleMeta}>
                    {formatDateTime(sale.createdAt)}
                  </Text>
                </View>

                <Text style={styles.saleTotal}>
                  {formatMoney(sale.finalTotalAmount)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button title="New sale" onPress={() => router.push("/(staff)/sales/new-sale")} />
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
  saleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  saleMain: {
    flex: 1,
    gap: 4,
  },
  saleTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  saleMeta: {
    fontSize: 14,
    color: "#666666",
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: "700",
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
});