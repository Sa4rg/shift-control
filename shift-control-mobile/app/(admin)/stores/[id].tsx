import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Alert } from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { getStoreById, deactivateStore } from "@/src/api/stores";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import type { Store } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { formatMoney } from "@/src/utils/money";

type StoreDetailState =
  | {
      status: "loading";
      store: null;
      errorMessage: null;
    }
  | {
      status: "ready";
      store: Store;
      errorMessage: null;
    }
  | {
      status: "error";
      store: null;
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

export default function AdminStoreDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const storeId = params.id;

  const [state, setState] = useState<StoreDetailState>({
    status: "loading",
    store: null,
    errorMessage: null,
  });

  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(
    null
  );
  const [isDeactivating, setIsDeactivating] = useState(false);

  const loadStore = useCallback(async () => {
    if (!storeId) {
      setState({
        status: "error",
        store: null,
        errorMessage: "Store id is missing.",
      });
      return;
    }

    setState({
      status: "loading",
      store: null,
      errorMessage: null,
    });

    try {
      const store = await getStoreById(storeId);

      setState({
        status: "ready",
        store,
        errorMessage: null,
      });
    } catch (error) {
      setState({
        status: "error",
        store: null,
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, [storeId]);

  async function handleDeactivateStore() {
    if (!storeId || state.status !== "ready" || !state.store.active) {
        return;
    }

    setIsDeactivating(true);
    setActionErrorMessage(null);

    try {
        const updatedStore = await deactivateStore(storeId);

        setState({
        status: "ready",
        store: updatedStore,
        errorMessage: null,
        });
    } catch (error) {
        setActionErrorMessage(getApiErrorMessage(error));
    } finally {
        setIsDeactivating(false);
    }
    }

    function confirmDeactivateStore() {
    if (state.status !== "ready") {
        return;
    }

    Alert.alert(
        "Deactivate store",
        `Are you sure you want to deactivate ${state.store.name}? This store should not be used for new operations after deactivation.`,
        [
        {
            text: "Cancel",
            style: "cancel",
        },
        {
            text: "Deactivate",
            style: "destructive",
            onPress: () => {
            void handleDeactivateStore();
            },
        },
        ]
    );
    }

  useEffect(() => {
    void loadStore();
  }, [loadStore]);

  if (state.status === "loading") {
    return <LoadingState message="Loading store..." />;
  }

  if (state.status === "error") {
    return (
      <Screen>
        <View style={styles.container}>
          <Text style={styles.title}>Store detail</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Could not load store</Text>
            <ErrorMessage message={state.errorMessage} />
            <Button title="Try again" onPress={loadStore} />
            <Button title="Back" onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  const store = state.store;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Store detail</Text>
          <Text style={styles.subtitle}>Store {store.id.slice(0, 8)}</Text>
        </View>

        <View style={store.active ? styles.successCard : styles.warningCard}>
          <Text style={store.active ? styles.successTitle : styles.warningTitle}>
            {store.active ? "Active store" : "Inactive store"}
          </Text>
          <Text style={store.active ? styles.successText : styles.warningText}>
            {store.active
              ? "This store can be used for staff assignment and reports."
              : "This store is inactive and should not be used for new operations."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{store.name}</Text>

          <DetailRow label="Address" value={store.address} />
          <DetailRow
            label="Base cash amount"
            value={formatMoney(store.baseCashAmount)}
          />
          <DetailRow label="Status" value={store.active ? "Active" : "Inactive"} />
        </View>

        {!store.active ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Deactivation</Text>

            <DetailRow label="Deactivated by" value={store.deactivatedByName} />
            <DetailRow
              label="Deactivated at"
              value={
                store.deactivatedAt ? formatDateTime(store.deactivatedAt) : null
              }
            />
          </View>
        ) : null}

        <ErrorMessage message={actionErrorMessage} />

        <View style={styles.actions}>
        {store.active ? (
            <Button
            title="Deactivate store"
            onPress={confirmDeactivateStore}
            loading={isDeactivating}
            disabled={isDeactivating}
            />
        ) : null}

        <Button title="Refresh" onPress={loadStore} disabled={isDeactivating} />
        <Button
            title="Back"
            onPress={() => router.back()}
            disabled={isDeactivating}
        />
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