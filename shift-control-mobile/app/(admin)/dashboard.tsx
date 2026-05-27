import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { listStores } from "@/src/api/stores";
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
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

type AdminModule = {
  title: string;
  icon: string;
  accent: "primary" | "warning";
  onPress: () => void;
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
      const stores = await listStores({
        includeInactive: includeInactiveStores,
      });

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

  const displayName = user?.fullName ?? user?.username ?? "Admin";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  const modules: AdminModule[] = [
    {
      title: "Users",
      icon: "♙",
      accent: "primary",
      onPress: () => router.push("/(admin)/users"),
    },
    {
      title: "Incidents",
      icon: "△",
      accent: "warning",
      onPress: () => router.push("/(admin)/incidents"),
    },
    {
      title: "Shifts",
      icon: "▣",
      accent: "primary",
      onPress: () => router.push("/(admin)/shifts"),
    },
    {
      title: "Reports",
      icon: "▥",
      accent: "primary",
      onPress: () => router.push("/(admin)/reports"),
    },
    {
      title: "Weekly Reviews",
      icon: "▤",
      accent: "primary",
      onPress: () => router.push("/(admin)/weekly-reviews"),
    },
    {
      title: "Create Store",
      icon: "▧",
      accent: "primary",
      onPress: () => router.push("/(admin)/stores/new-store"),
    },
  ];

  const activeStoreCount =
    storesState.status === "ready"
      ? storesState.stores.filter((store) => store.active).length
      : 0;

  const inactiveStoreCount =
    storesState.status === "ready"
      ? storesState.stores.filter((store) => !store.active).length
      : 0;

  if (storesState.status === "loading") {
    return <LoadingState message="Loading admin dashboard..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Admin dashboard</Text>
          <Text style={styles.pageSubtitle}>Welcome, {displayName}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Admin modules</Text>
          </View>

          <View style={styles.moduleList}>
            {modules.map((module, index) => (
              <Pressable
                key={module.title}
                style={({ pressed }) => [
                  styles.moduleRow,
                  index === modules.length - 1 && styles.moduleRowLast,
                  pressed && styles.rowPressed,
                ]}
                onPress={module.onPress}
              >
                <View style={styles.moduleLeft}>
                  <Text
                    style={[
                      styles.moduleIcon,
                      module.accent === "warning" && styles.moduleIconWarning,
                    ]}
                  >
                    {module.icon}
                  </Text>
                  <Text style={styles.moduleTitle}>{module.title}</Text>
                </View>

                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.storesHeader}>
            <Text style={styles.cardTitle}>Stores</Text>

            <Pressable
              style={({ pressed }) => [
                styles.refreshButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={loadStores}
            >
              <Text style={styles.refreshText}>⟳ Refresh</Text>
            </Pressable>
          </View>

          <View style={styles.storeFilters}>
            <Pressable
              style={[
                styles.filterChip,
                !includeInactiveStores && styles.filterChipActive,
              ]}
              onPress={() => setIncludeInactiveStores(false)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  !includeInactiveStores && styles.filterChipTextActive,
                ]}
              >
                Active only
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.filterChip,
                includeInactiveStores && styles.filterChipActive,
              ]}
              onPress={() => setIncludeInactiveStores(true)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  includeInactiveStores && styles.filterChipTextActive,
                ]}
              >
                Include inactive
              </Text>
            </Pressable>
          </View>

          {storesState.status === "ready" ? (
            <Text style={styles.storeSummary}>
              Active: {activeStoreCount} · Inactive: {inactiveStoreCount}
            </Text>
          ) : null}

          {storesState.status === "error" ? (
            <View style={styles.errorBlock}>
              <ErrorMessage message={storesState.errorMessage} />
              <Pressable
                style={({ pressed }) => [
                  styles.btnOutline,
                  pressed && styles.buttonPressed,
                ]}
                onPress={loadStores}
              >
                <Text style={styles.btnOutlineText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {storesState.status === "ready" && storesState.stores.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No stores found</Text>
              <Text style={styles.emptyText}>
                Try changing the visibility filter or create a new store.
              </Text>
            </View>
          ) : null}

          {storesState.status === "ready" && storesState.stores.length > 0 ? (
            <View style={styles.storeList}>
              {storesState.stores.map((store) => (
                <Pressable
                  key={store.id}
                  style={({ pressed }) => [
                    styles.storeCard,
                    !store.active && styles.storeCardInactive,
                    pressed && styles.storeCardPressed,
                  ]}
                  onPress={() => router.push(`/(admin)/stores/${store.id}`)}
                >
                  <View style={styles.storeCardTop}>
                    <Text style={styles.storeName}>{store.name}</Text>

                    <View
                      style={[
                        styles.statusBadge,
                        store.active
                          ? styles.statusBadgeActive
                          : styles.statusBadgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          store.active
                            ? styles.statusBadgeTextActive
                            : styles.statusBadgeTextInactive,
                        ]}
                      >
                        {store.active ? "ACTIVE" : "INACTIVE"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.storeAddress}>⌾ {store.address}</Text>

                  <Text style={styles.baseCash}>
                    Base: {formatMoney(store.baseCashAmount)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.logoutContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>⇱ Logout</Text>
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
    fontWeight: "700",
    color: "#00685f",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#dde1ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bcc9c6",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#00217a",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  pageHeader: {
    gap: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#131b2e",
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 16,
    color: "#3d4947",
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#131b2e",
  },
  moduleList: {
    backgroundColor: "#ffffff",
  },
  moduleRow: {
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  moduleRowLast: {
    borderBottomWidth: 0,
  },
  moduleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  moduleIcon: {
    width: 22,
    textAlign: "center",
    fontSize: 18,
    color: "#00685f",
    fontWeight: "700",
  },
  moduleIconWarning: {
    color: "#825100",
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#131b2e",
  },
  chevron: {
    fontSize: 24,
    color: "#3d4947",
  },
  rowPressed: {
    backgroundColor: "#f2f3ff",
  },
  storesHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  refreshButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#00685f",
  },
  storeFilters: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#f2f3ff",
    borderWidth: 1,
    borderColor: "#eaedff",
  },
  filterChipActive: {
    backgroundColor: "#00685f",
    borderColor: "#00685f",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3d4947",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  storeSummary: {
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 13,
    color: "#3d4947",
  },
  errorBlock: {
    padding: 16,
    gap: 12,
  },
  emptyCard: {
    margin: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    backgroundColor: "#f8fafc",
    padding: 16,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#131b2e",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#3d4947",
  },
  storeList: {
    padding: 16,
    gap: 12,
  },
  storeCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dae2fd",
    backgroundColor: "#f2f3ff",
    padding: 14,
    gap: 7,
  },
  storeCardInactive: {
    opacity: 0.82,
  },
  storeCardPressed: {
    borderColor: "#00685f",
    backgroundColor: "#edf8f6",
  },
  storeCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  storeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#131b2e",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeActive: {
    backgroundColor: "#89f5e7",
  },
  statusBadgeInactive: {
    backgroundColor: "#bcc9c6",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  statusBadgeTextActive: {
    color: "#005049",
  },
  statusBadgeTextInactive: {
    color: "#3d4947",
  },
  storeAddress: {
    fontSize: 13,
    color: "#3d4947",
    lineHeight: 18,
  },
  baseCash: {
    fontSize: 13,
    fontWeight: "700",
    color: "#00685f",
  },
  btnOutline: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#00685f",
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00685f",
  },
  logoutContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  logoutButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3d4947",
  },
  buttonPressed: {
    opacity: 0.72,
  },
});