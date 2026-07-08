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
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type { Store } from "@/src/types/api";
import { formatMoney } from "@/src/utils/money";
import { colors, fontWeight, fontSize, shadows, radius } from "@/src/theme";

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
      <AppTopBar variant="root" />

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

        <View style={styles.logoutCard}>
          <Pressable
            style={({ pressed }) => [
              styles.logoutRow,
              pressed && styles.logoutRowPressed,
            ]}
            onPress={() => void handleLogout()}
            accessibilityRole="button"
            accessibilityLabel="Logout"
          >
            <View style={styles.logoutLeft}>
              <Text style={styles.logoutIcon}>⎋</Text>
              <Text style={styles.logoutText}>Logout</Text>
            </View>

            <Text style={styles.logoutChevron}>›</Text>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  pageHeader: {
    gap: 4,
  },
  pageTitle: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.card,
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  cardTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  moduleList: {
    backgroundColor: colors.surface,
  },
  moduleRow: {
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
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
    fontSize: fontSize.xxl,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  moduleIconWarning: {
    color: colors.warning,
  },
  moduleTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  chevron: {
    fontSize: 24,
    color: colors.textMuted,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  storesHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  refreshButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  refreshText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  storeFilters: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  filterChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: "#00685f",
  },
  filterChipText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  storeSummary: {
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  errorBlock: {
    padding: 16,
    gap: 12,
  },
  emptyCard: {
    margin: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    padding: 16,
    gap: 6,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  emptyText: {
    fontSize: fontSize.base,
    lineHeight: 20,
    color: colors.textMuted,
  },
  storeList: {
    padding: 16,
    gap: 12,
  },
  storeCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dae2fd",
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    gap: 7,
  },
  storeCardInactive: {
    opacity: 0.82,
  },
  storeCardPressed: {
    borderColor: "#00685f",
    backgroundColor: colors.primarySoft,
  },
  storeCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  storeName: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statusBadge: {
    borderRadius: radius.pill,
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
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extrabold,
    letterSpacing: 0.4,
  },
  statusBadgeTextActive: {
    color: colors.primaryDark,
  },
  statusBadgeTextInactive: {
    color: colors.textMuted,
  },
  storeAddress: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 18,
  },
  baseCash: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  btnOutline: {
    height: 44,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: "#00685f",
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutlineText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  buttonPressed: {
    opacity: 0.72,
  },
  logoutCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    overflow: "hidden",
    ...shadows.card,
  },
  logoutRow: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoutRowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  logoutLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logoutIcon: {
    width: 24,
    fontSize: fontSize.lg,
    color: colors.danger,
    textAlign: "center",
  },
  logoutText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.danger,
  },
  logoutChevron: {
    fontSize: 28,
    color: colors.danger,
  },
});