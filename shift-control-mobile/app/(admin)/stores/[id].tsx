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
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { DetailRow, StatusBadge } from "@/src/components/ui";
import type { Store } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { formatMoney } from "@/src/utils/money";
import { colors, commonStyles, fontWeight, fontSize, radius } from "@/src/theme";

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

  const appBar = <AppTopBar variant="back" />;

  if (state.status === "error") {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        {appBar}

        <ScrollView
          contentContainerStyle={commonStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={commonStyles.pageHeader}>
            <Text style={commonStyles.pageTitle}>Store detail</Text>
          </View>

          <View style={commonStyles.card}>
            <View style={commonStyles.cardHeader}>
              <Text style={commonStyles.cardTitle}>Could not load store</Text>
            </View>

            <View style={commonStyles.cardBody}>
              <ErrorMessage message={state.errorMessage} />

              <Pressable
                style={({ pressed }) => [
                  commonStyles.outlineButton,
                  pressed && commonStyles.buttonPressed,
                ]}
                onPress={loadStore}
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

  const store = state.store;

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      {appBar}

      <ScrollView
        contentContainerStyle={commonStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={commonStyles.pageHeader}>
          <Text style={commonStyles.pageTitle}>Store detail</Text>
          <Text style={commonStyles.pageSubtitle}>ID: {store.id.slice(0, 8)}</Text>
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

        <View style={commonStyles.card}>
          <View style={commonStyles.cardBody}>
            <View style={styles.storeTitleRow}>
              <Text style={styles.storeName}>{store.name}</Text>
              <StatusBadge active={store.active} />
            </View>

            <DetailRow label="ADDRESS" value={store.address} />

            <DetailRow
              label="WI-FI NETWORK"
              value={store.wifiSsid}
              valueStyle={styles.primaryValue}
            />

            <DetailRow
              label="BASE CASH AMOUNT"
              value={formatMoney(store.baseCashAmount)}
              valueStyle={styles.primaryValue}
            />

            <View style={commonStyles.detailRow}>
              <Text style={commonStyles.detailLabel}>STATUS</Text>

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
                    commonStyles.detailValue,
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
          <View style={commonStyles.card}>
            <View style={commonStyles.cardBody}>
              <Text style={commonStyles.sectionLabel}>Deactivation</Text>

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

        <View style={commonStyles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.btnEdit,
              pressed && commonStyles.buttonPressed,
            ]}
            onPress={() =>
              router.push(`/(admin)/stores/${store.id}/edit`)
            }
            disabled={isDeactivating}
          >
            <Text style={styles.btnEditText}>Edit store</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              commonStyles.btnRefresh,
              pressed && commonStyles.buttonPressed,
            ]}
            onPress={loadStore}
            disabled={isDeactivating}
          >
            <Text style={commonStyles.btnRefreshText}>⟳ Refresh</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              commonStyles.btnBack,
              pressed && commonStyles.buttonPressed,
            ]}
            onPress={() => router.back()}
            disabled={isDeactivating}
          >
            <Text style={commonStyles.btnBackText}>← Back</Text>
          </Pressable>
        </View>

        <View style={styles.adminActions}>
          {store.active ? (
            <>
              <Pressable
                style={({ pressed }) => [
                  commonStyles.dangerButton,
                  (pressed || isDeactivating) && commonStyles.buttonPressed,
                ]}
                onPress={confirmDeactivateStore}
                disabled={isDeactivating}
              >
                <Text style={commonStyles.dangerButtonText}>
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
  errorCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
    backgroundColor: "#fff8f7",
    padding: 14,
  },
  btnEdit: {
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnEditText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.surface,
  },
  adminActions: {
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
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
});