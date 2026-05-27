import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { deactivateStore, getStoreById } from "@/src/api/stores";
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
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

function DetailRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string | null;
  valueStyle?: object;
}) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function StoreStatusBadge({ active }: { active: boolean }) {
  return (
    <View
      style={[
        styles.statusBadge,
        active ? styles.statusBadgeActive : styles.statusBadgeInactive,
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          active
            ? styles.statusBadgeTextActive
            : styles.statusBadgeTextInactive,
        ]}
      >
        {active ? "ACTIVE" : "INACTIVE"}
      </Text>
    </View>
  );
}

export default function AdminStoreDetailScreen() {
  const { user } = useAuth();
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

  const displayName = user?.fullName ?? user?.username ?? "Admin";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (state.status === "loading") {
    return <LoadingState message="Loading store..." />;
  }

  const appBar = (
    <View style={styles.appBar}>
      <View style={styles.appBarLeft}>
        <Pressable
          style={({ pressed }) => [
            styles.appBarBackButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.back()}
          disabled={isDeactivating}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <Text style={styles.appBarTitle}>Shift Control</Text>
      </View>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    </View>
  );

  if (state.status === "error") {
    return (
      <SafeAreaView style={styles.safeArea}>
        {appBar}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Store detail</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Could not load store</Text>
            </View>

            <View style={styles.cardBody}>
              <ErrorMessage message={state.errorMessage} />

              <Pressable
                style={({ pressed }) => [
                  styles.btnOutline,
                  pressed && styles.buttonPressed,
                ]}
                onPress={loadStore}
              >
                <Text style={styles.btnOutlineText}>Try again</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.btnBack,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => router.back()}
              >
                <Text style={styles.btnBackText}>← Back</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const store = state.store;

  return (
    <SafeAreaView style={styles.safeArea}>
      {appBar}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Store detail</Text>
          <Text style={styles.pageSubtitle}>ID: {store.id.slice(0, 8)}</Text>
        </View>

        <View
          style={[
            styles.statusBanner,
            store.active
              ? styles.statusBannerActive
              : styles.statusBannerInactive,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              store.active ? styles.statusDotActive : styles.statusDotInactive,
            ]}
          />

          <Text
            style={[
              styles.statusBannerText,
              store.active
                ? styles.statusBannerTextActive
                : styles.statusBannerTextInactive,
            ]}
          >
            {store.active
              ? "Active store — can be used for operations"
              : "Inactive store — cannot be used for new operations"}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardBody}>
            <View style={styles.storeTitleRow}>
              <Text style={styles.storeName}>{store.name}</Text>
              <StoreStatusBadge active={store.active} />
            </View>

            <DetailRow label="ADDRESS" value={store.address} />

            <DetailRow
              label="BASE CASH AMOUNT"
              value={formatMoney(store.baseCashAmount)}
              valueStyle={styles.primaryValue}
            />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>STATUS</Text>

              <View style={styles.inlineStatus}>
                <View
                  style={[
                    styles.inlineStatusDot,
                    store.active
                      ? styles.statusDotActive
                      : styles.statusDotInactive,
                  ]}
                />
                <Text
                  style={[
                    styles.detailValue,
                    store.active ? styles.primaryValue : styles.warningValue,
                  ]}
                >
                  {store.active ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {!store.active ? (
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.sectionTitle}>Deactivation</Text>

              <DetailRow
                label="DEACTIVATED BY"
                value={store.deactivatedByName}
              />

              <DetailRow
                label="DEACTIVATED AT"
                value={
                  store.deactivatedAt ? formatDateTime(store.deactivatedAt) : null
                }
              />
            </View>
          </View>
        ) : null}

        {actionErrorMessage ? (
          <View style={styles.errorCard}>
            <ErrorMessage message={actionErrorMessage} />
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.btnRefresh,
              pressed && styles.buttonPressed,
            ]}
            onPress={loadStore}
            disabled={isDeactivating}
          >
            <Text style={styles.btnRefreshText}>⟳ Refresh</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.btnBack,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.back()}
            disabled={isDeactivating}
          >
            <Text style={styles.btnBackText}>← Back</Text>
          </Pressable>
        </View>

        <View style={styles.adminActions}>
          {store.active ? (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.btnDanger,
                  (pressed || isDeactivating) && styles.buttonPressed,
                ]}
                onPress={confirmDeactivateStore}
                disabled={isDeactivating}
              >
                <Text style={styles.btnDangerText}>
                  {isDeactivating ? "Deactivating…" : "⊘ Deactivate store"}
                </Text>
              </Pressable>

              <Text style={styles.dangerHelpText}>
                This action will prevent new operations from this store.
              </Text>
            </>
          ) : (
            <Text style={styles.inactiveHelpText}>
              This store has already been deactivated.
            </Text>
          )}
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
    gap: 10,
  },
  appBarBackButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 20,
    fontWeight: "700",
    color: "#00685f",
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#00685f",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#dde1ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bcc9c6",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#00217a",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    gap: 16,
  },
  pageHeader: {
    gap: 5,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#131b2e",
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3d4947",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  statusBanner: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusBannerActive: {
    backgroundColor: "#00685f",
    borderColor: "#00685f",
  },
  statusBannerInactive: {
    backgroundColor: "#fff8e6",
    borderColor: "#f0d8a0",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotActive: {
    backgroundColor: "#ffffff",
  },
  statusDotInactive: {
    backgroundColor: "#825100",
  },
  statusBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  statusBannerTextActive: {
    color: "#ffffff",
  },
  statusBannerTextInactive: {
    color: "#825100",
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
    fontSize: 18,
    fontWeight: "800",
    color: "#131b2e",
  },
  cardBody: {
    padding: 16,
    gap: 18,
  },
  storeTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  storeName: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: "#131b2e",
    letterSpacing: -0.2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#00685f",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  detailRow: {
    gap: 5,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eaedff",
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#6d7a77",
    letterSpacing: 0.8,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#131b2e",
    lineHeight: 21,
  },
  primaryValue: {
    color: "#00685f",
  },
  warningValue: {
    color: "#825100",
  },
  inlineStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeActive: {
    backgroundColor: "#d2f5f0",
  },
  statusBadgeInactive: {
    backgroundColor: "#fff8e6",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  statusBadgeTextActive: {
    color: "#005049",
  },
  statusBadgeTextInactive: {
    color: "#825100",
  },
  errorCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffdad6",
    backgroundColor: "#fff8f7",
    padding: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 4,
  },
  btnRefresh: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#89f5e7",
    alignItems: "center",
    justifyContent: "center",
  },
  btnRefreshText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#005049",
  },
  btnBack: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#bcc9c6",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  btnBackText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#3d4947",
  },
  adminActions: {
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eaedff",
  },
  btnDanger: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#ba1a1a",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDangerText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#ba1a1a",
  },
  dangerHelpText: {
    fontSize: 13,
    color: "#3d4947",
    textAlign: "center",
    lineHeight: 19,
  },
  inactiveHelpText: {
    fontSize: 14,
    color: "#3d4947",
    textAlign: "center",
    lineHeight: 20,
  },
  btnOutline: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#00685f",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#00685f",
  },
  buttonPressed: {
    opacity: 0.72,
  },
});