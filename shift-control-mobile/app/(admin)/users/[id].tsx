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
import { getStoreById } from "@/src/api/stores";
import {
  deactivateUser,
  getUserById,
  getUserMonthlyWorkHours,
} from "@/src/api/users";
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { AppCard, DetailRow } from "@/src/components/ui";
import type { AdminUser, MonthlyWorkHours, Store } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import {
  formatMinutesAsHours,
  formatMonthLabel,
  getNextMonth,
  getPreviousMonth,
} from "@/src/utils/monthlyWorkHours";
import { colors, commonStyles, fontWeight, fontSize, radius } from "@/src/theme";

type UserDetailState =
  | {
      status: "loading";
      user: null;
      store: null;
      errorMessage: null;
    }
  | {
      status: "ready";
      user: AdminUser;
      store: Store | null;
      errorMessage: null;
    }
  | {
      status: "error";
      user: null;
      store: null;
      errorMessage: string;
    };

type AdminUserWithOptionalMetadata = AdminUser & {
  createdAt?: string | null;
};

function getCreatedAt(user: AdminUser): string | null {
  const userWithMetadata = user as AdminUserWithOptionalMetadata;

  return userWithMetadata.createdAt ?? null;
}

function getStoreLabel(user: AdminUser, store: Store | null): string | null {
  if (user.role === "ADMIN") {
    return "All stores";
  }

  if (store) {
    return store.name;
  }

  if (user.storeId) {
    return `Store ${user.storeId.slice(0, 8)}`;
  }

  return null;
}

function RoleBadge({ role }: { role: AdminUser["role"] }) {
  return (
    <View style={styles.roleBadge}>
      <Text style={styles.roleBadgeText}>
        {role === "ADMIN" ? "Admin" : "Staff"}
      </Text>
    </View>
  );
}

export default function AdminUserDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const userId = params.id;

  const [state, setState] = useState<UserDetailState>({
    status: "loading",
    user: null,
    store: null,
    errorMessage: null,
  });

  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(
    null
  );
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Monthly work hours state
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1
  );
  const [monthlyHours, setMonthlyHours] =
    useState<MonthlyWorkHours | null>(null);
  const [monthlyHoursLoading, setMonthlyHoursLoading] = useState(false);
  const [monthlyHoursError, setMonthlyHoursError] = useState<string | null>(
    null
  );

  const loadUser = useCallback(async () => {
    if (!userId) {
      setState({
        status: "error",
        user: null,
        store: null,
        errorMessage: "User id is missing.",
      });
      return;
    }

    setState({
      status: "loading",
      user: null,
      store: null,
      errorMessage: null,
    });

    try {
      const loadedUser = await getUserById(userId);

      let store: Store | null = null;

      if (loadedUser.storeId) {
        try {
          store = await getStoreById(loadedUser.storeId);
        } catch {
          store = null;
        }
      }

      setState({
        status: "ready",
        user: loadedUser,
        store,
        errorMessage: null,
      });
    } catch (error) {
      setState({
        status: "error",
        user: null,
        store: null,
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, [userId]);

  async function handleDeactivateUser() {
    if (!userId || state.status !== "ready" || !state.user.active) {
      return;
    }

    setIsDeactivating(true);
    setActionErrorMessage(null);

    try {
      const updatedUser = await deactivateUser(userId);

      let store: Store | null = state.store;

      if (updatedUser.storeId) {
        try {
          store = await getStoreById(updatedUser.storeId);
        } catch {
          store = null;
        }
      }

      setState({
        status: "ready",
        user: updatedUser,
        store,
        errorMessage: null,
      });
    } catch (error) {
      setActionErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsDeactivating(false);
    }
  }

  const loadMonthlyHours = useCallback(async () => {
    if (!userId) {
      return;
    }

    setMonthlyHoursLoading(true);
    setMonthlyHoursError(null);

    try {
      const data = await getUserMonthlyWorkHours(
        userId,
        selectedYear,
        selectedMonth
      );
      setMonthlyHours(data);
    } catch (error) {
      setMonthlyHoursError(getApiErrorMessage(error));
    } finally {
      setMonthlyHoursLoading(false);
    }
  }, [userId, selectedYear, selectedMonth]);

  function confirmDeactivateUser() {
    if (state.status !== "ready") {
      return;
    }

    Alert.alert(
      "Deactivate user",
      `Are you sure you want to deactivate ${state.user.fullName}? This user will not be able to use the app after deactivation.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: () => {
            void handleDeactivateUser();
          },
        },
      ]
    );
  }

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (state.status === "ready" && state.user.role === "STAFF") {
      void loadMonthlyHours();
    }
  }, [state, loadMonthlyHours]);

  if (state.status === "loading") {
    return <LoadingState message="Loading user..." />;
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
            <Text style={commonStyles.pageTitle}>User detail</Text>
          </View>

          <AppCard title="Could not load user">
            <ErrorMessage message={state.errorMessage} />

            <Pressable
              style={({ pressed }) => [
                commonStyles.outlineButton,
                pressed && commonStyles.buttonPressed,
              ]}
              onPress={loadUser}
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
          </AppCard>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { user, store } = state;
  const createdAt = getCreatedAt(user);
  const storeLabel = getStoreLabel(user, store);

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      {appBar}

      <ScrollView
        contentContainerStyle={commonStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={commonStyles.pageHeader}>
          <Text style={commonStyles.pageTitle}>User detail</Text>
          <Text style={commonStyles.pageSubtitle}>ID: {user.id.slice(0, 8)}</Text>
        </View>

        <View
          style={[
            styles.statusBanner,
            user.active ? styles.statusBannerActive : styles.statusBannerInactive,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              user.active ? styles.statusDotActive : styles.statusDotInactive,
            ]}
          />
          <Text
            style={[
              styles.statusBannerText,
              user.active
                ? styles.statusBannerTextActive
                : styles.statusBannerTextInactive,
            ]}
          >
            {user.active ? "Account is active" : "Account is inactive"}
          </Text>
        </View>

        <AppCard title="Account">
          <DetailRow label="FULL NAME" value={user.fullName} />
          <DetailRow label="USERNAME" value={`@${user.username}`} />

          <DetailRow label="ROLE">
            <RoleBadge role={user.role} />
          </DetailRow>

          <DetailRow label="STORE NAME" value={storeLabel} />

          <DetailRow
            label="ACTIVE STATUS"
            value={user.active ? "Verified Active" : "Inactive"}
            valueStyle={
              user.active ? styles.activeValue : styles.inactiveValue
            }
          />

          <DetailRow
            label="EMAIL"
            value={user.email}
          />

          <DetailRow
            label="CREATED AT"
            value={createdAt ? formatDateTime(createdAt) : null}
          />
        </AppCard>

        {user.storeId ? (
          <AppCard title="Assigned store">
            <DetailRow
              label="STORE"
              value={store ? store.name : user.storeId.slice(0, 8)}
            />

            {store ? (
              <DetailRow label="ADDRESS" value={store.address} />
            ) : null}

            <Pressable
              style={({ pressed }) => [
                commonStyles.outlineButton,
                pressed && commonStyles.buttonPressed,
              ]}
              onPress={() => router.push(`/(admin)/stores/${user.storeId}`)}
            >
              <Text style={commonStyles.outlineButtonText}>View store</Text>
            </Pressable>
          </AppCard>
        ) : null}

        {user.role === "STAFF" ? (
          <AppCard title="Monthly hours">
            <View style={styles.monthNavigation}>
              <Pressable
                style={({ pressed }) => [
                  styles.monthNavButton,
                  pressed && commonStyles.buttonPressed,
                ]}
                onPress={() => {
                  const prev = getPreviousMonth(selectedYear, selectedMonth);
                  setSelectedYear(prev.year);
                  setSelectedMonth(prev.month);
                }}
                disabled={monthlyHoursLoading}
              >
                <Text style={styles.monthNavButtonText}>←</Text>
              </Pressable>

              <Text style={styles.monthLabel}>
                {formatMonthLabel(selectedYear, selectedMonth)}
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.monthNavButton,
                  pressed && commonStyles.buttonPressed,
                ]}
                onPress={() => {
                  const next = getNextMonth(selectedYear, selectedMonth);
                  setSelectedYear(next.year);
                  setSelectedMonth(next.month);
                }}
                disabled={monthlyHoursLoading}
              >
                <Text style={styles.monthNavButtonText}>→</Text>
              </Pressable>
            </View>

            {monthlyHoursLoading ? (
              <Text style={styles.loadingText}>Loading...</Text>
            ) : monthlyHoursError ? (
              <ErrorMessage message={monthlyHoursError} />
            ) : monthlyHours ? (
              <>
                <View style={styles.hoursMetric}>
                  <Text style={styles.hoursLabel}>TOTAL HOURS</Text>
                  <Text style={styles.hoursValue}>
                    {formatMinutesAsHours(monthlyHours.totalMinutes)}
                  </Text>
                </View>

                <View style={styles.hoursMetric}>
                  <Text style={styles.hoursLabel}>SHIFTS CLOSED</Text>
                  <Text style={styles.hoursValue}>
                    {monthlyHours.closedShiftCount}
                  </Text>
                </View>
              </>
            ) : null}
          </AppCard>
        ) : null}

        {!user.active ? (
          <AppCard title="Deactivation">
            <DetailRow
              label="DEACTIVATED BY"
              value={user.deactivatedByName}
            />
            <DetailRow
              label="DEACTIVATED AT"
              value={
                user.deactivatedAt ? formatDateTime(user.deactivatedAt) : null
              }
            />
          </AppCard>
        ) : null}

        <AppCard title="Actions">
          {actionErrorMessage ? (
            <ErrorMessage message={actionErrorMessage} />
          ) : null}

          {user.active ? (
            <Pressable
              style={({ pressed }) => [
                commonStyles.dangerButton,
                (pressed || isDeactivating) && commonStyles.buttonPressed,
              ]}
              onPress={confirmDeactivateUser}
              disabled={isDeactivating}
            >
              <Text style={commonStyles.dangerButtonText}>
                {isDeactivating ? "Deactivating…" : "♙ Deactivate user"}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.inactiveHelpText}>
              This user has already been deactivated.
            </Text>
          )}
        </AppCard>

        <View style={commonStyles.actions}>
          <Pressable
            style={({ pressed }) => [
              commonStyles.btnRefresh,
              pressed && commonStyles.buttonPressed,
            ]}
            onPress={loadUser}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Status banner (específico de esta pantalla)
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
    backgroundColor: colors.primarySoft,
    borderColor: "#b9ddd8",
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
    backgroundColor: colors.primary,
  },
  statusDotInactive: {
    backgroundColor: "#825100",
  },
  statusBannerText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.extrabold,
  },
  statusBannerTextActive: {
    color: colors.primary,
  },
  statusBannerTextInactive: {
    color: colors.warning,
  },

  // Role badge (específico de users)
  roleBadge: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: colors.secondarySoft,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: fontWeight.extrabold,
    color: "#173bab",
  },

  // Valores de estado específicos
  activeValue: {
    color: colors.primary,
  },
  inactiveValue: {
    color: colors.warning,
  },

  // Monthly hours navigation y metrics
  monthNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  monthNavButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  monthNavButtonText: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  monthLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  hoursMetric: {
    gap: 5,
  },
  hoursLabel: {
    fontSize: 11,
    fontWeight: fontWeight.extrabold,
    color: colors.textSubtle,
    letterSpacing: 0.8,
  },
  hoursValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 26,
  },

  // Misc
  inactiveHelpText: {
    fontSize: fontSize.base,
    lineHeight: 20,
    color: colors.textMuted,
  },
  loadingText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: 12,
  },
});