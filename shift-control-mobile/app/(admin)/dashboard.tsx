import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { listStores } from "@/src/api/stores";
import { useAuth } from "@/src/auth/AuthContext";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import type { Store } from "@/src/types/api";
import { formatMoney } from "@/src/utils/money";

type StoresState =
  | {
      status: "loading";
      stores: Store[];
      errorMessage: null;
    }
  | {
      status: "ready";
      stores: Store[];
      errorMessage: null;
    }
  | {
      status: "error";
      stores: Store[];
      errorMessage: string;
    };

export default function AdminDashboardScreen() {
  const { user, logout } = useAuth();

  const [storesState, setStoresState] = useState<StoresState>({
    status: "loading",
    stores: [],
    errorMessage: null,
  });

  const [includeInactiveStores, setIncludeInactiveStores] = useState(false);

  const loadStores = useCallback(async () => {
    setStoresState({
      status: "loading",
      stores: [],
      errorMessage: null,
    });

    try {
      const stores = await listStores({ includeInactive: includeInactiveStores });

      setStoresState({
        status: "ready",
        stores,
        errorMessage: null,
      });
    } catch (error) {
      setStoresState({
        status: "error",
        stores: [],
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, [includeInactiveStores]);

  useFocusEffect(
    useCallback(() => {
      void loadStores();
    }, [loadStores])
  );

  async function handleLogout() {
    await logout();
    router.replace("/");
  }

  if (storesState.status === "loading") {
    return <LoadingState message="Loading admin dashboard..." />;
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin dashboard</Text>
          <Text style={styles.subtitle}>Welcome, {user?.fullName}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Admin modules</Text>
          <Text style={styles.body}>
            Stores are available now. Users, incidents, reports, and weekly
            reviews will be implemented next.
          </Text>

          <Button title="Users" onPress={() => router.push("/(admin)/users")} />
            
          <Button
            title="Incidents"
            onPress={() => router.push("/(admin)/incidents")}
          />

          <Button title="Shifts" onPress={() => router.push("/(admin)/shifts")} />

          <Button title="Reports" onPress={() => router.push("/(admin)/reports")} />

          <Button
            title="Weekly reviews" onPress={() => router.push("/(admin)/weekly-reviews")}/>

          <Button
            title="Create store" onPress={() => router.push("/(admin)/stores/new-store")}/>           
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Stores</Text>
            <Pressable onPress={loadStores}>
              <Text style={styles.refreshLink}>Refresh</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Store visibility</Text>
          <View style={styles.filterOptions}>
            <Pressable
              style={[styles.filterButton, !includeInactiveStores && styles.filterButtonActive]}
              onPress={() => setIncludeInactiveStores(false)}
            >
              <Text style={!includeInactiveStores ? styles.filterButtonTextActive : styles.filterButtonText}>
                {!includeInactiveStores ? "✓ Active only" : "Active only"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterButton, includeInactiveStores && styles.filterButtonActive]}
              onPress={() => setIncludeInactiveStores(true)}
            >
              <Text style={includeInactiveStores ? styles.filterButtonTextActive : styles.filterButtonText}>
                {includeInactiveStores ? "✓ Include inactive" : "Include inactive"}
              </Text>
            </Pressable>
          </View>

          {storesState.status === "ready" ? (
            <Text style={styles.storeSummary}>
              Active: {storesState.stores.filter((s) => s.active).length} · Inactive: {storesState.stores.filter((s) => !s.active).length}
            </Text>
          ) : null}

          {storesState.status === "error" ? (
            <>
              <ErrorMessage message={storesState.errorMessage} />
              <Button title="Try again" onPress={loadStores} />
            </>
          ) : null}

          {storesState.status === "ready" && storesState.stores.length === 0 ? (
            <Text style={styles.body}>No stores found.</Text>
          ) : null}

          {storesState.status === "ready" && storesState.stores.length > 0 ? (
            <View style={styles.storeList}>
              {storesState.stores.map((store) => (
                <Pressable
                  key={store.id}
                  style={styles.storeRow}
                  onPress={() => router.push(`/(admin)/stores/${store.id}`)}
                >
                  <View style={styles.storeMain}>
                    <Text style={styles.storeTitle}>{store.name}</Text>
                    <Text style={styles.storeMeta}>{store.address}</Text>
                    <Text style={styles.storeMeta}>
                      {store.active ? "Active" : "Inactive"} · Base cash{" "}
                      {formatMoney(store.baseCashAmount)}
                    </Text>
                  </View>

                  <Text style={styles.storeAction}>View</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button title="Logout" onPress={handleLogout} />
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
    fontSize: 18,
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  refreshLink: {
    fontSize: 16,
    fontWeight: "700",
  },
  storeList: {
    gap: 12,
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  storeMain: {
    gap: 4,
  },
  storeTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  storeMeta: {
    fontSize: 14,
    color: "#666666",
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
  storeAction: {
    fontSize: 14,
    fontWeight: "700",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555555",
  },
  filterOptions: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dddddd",
    backgroundColor: "#f5f5f5",
  },
  filterButtonActive: {
    borderColor: "#000000",
    backgroundColor: "#000000",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#555555",
  },
  filterButtonTextActive: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "700",
  },
  storeSummary: {
    fontSize: 14,
    color: "#666666",
  },
});