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
import { colors, fontWeight, fontSize, shadows, radius } from "@/src/theme";

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
    backgroundColor: colors.background,
  },
  appBar: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
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
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  appBarTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.secondaryDark,
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
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
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
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusBannerInactive: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotActive: {
    backgroundColor: colors.surface,
  },
  statusDotInactive: {
    backgroundColor: "#825100",
  },
  statusBannerText: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    lineHeight: 20,
  },
  statusBannerTextActive: {
    color: colors.surface,
  },
  statusBannerTextInactive: {
    color: colors.warning,
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
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: -0.2,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  detailRow: {
    gap: 5,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSubtle,
    letterSpacing: 0.8,
  },
  detailValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 21,
  },
  primaryValue: {
    color: colors.primary,
  },
  warningValue: {
    color: colors.warning,
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
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeActive: {
    backgroundColor: colors.primaryMuted,
  },
  statusBadgeInactive: {
    backgroundColor: colors.warningSoft,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.4,
  },
  statusBadgeTextActive: {
    color: colors.primaryDark,
  },
  statusBadgeTextInactive: {
    color: colors.warning,
  },
  errorCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
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
    borderRadius: radius.lg,
    backgroundColor: "#89f5e7",
    alignItems: "center",
    justifyContent: "center",
  },
  btnRefreshText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  btnBack: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  btnBackText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  adminActions: {
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  btnDanger: {
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDangerText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.danger,
  },
  dangerHelpText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },
  inactiveHelpText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  btnOutline: {
    height: 46,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  btnOutlineText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  buttonPressed: {
    opacity: 0.72,
  },
});