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
import { deactivateUser, getUserById } from "@/src/api/users";
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type { AdminUser, Store } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";
import { colors, fontWeight, fontSize, shadows, radius } from "@/src/theme";

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
  const { user: authUser } = useAuth();
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

  const displayName = authUser?.fullName ?? authUser?.username ?? "Admin";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (state.status === "loading") {
    return <LoadingState message="Loading user..." />;
  }

  const appBar = (
    <View style={styles.appBar}>
      <View style={styles.appBarLeft}>
        <Text style={styles.menuIcon}>≡</Text>
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
            <Text style={styles.pageTitle}>User detail</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Could not load user</Text>
            </View>

            <View style={styles.cardBody}>
              <ErrorMessage message={state.errorMessage} />

              <Pressable
                style={({ pressed }) => [
                  styles.btnOutline,
                  pressed && styles.buttonPressed,
                ]}
                onPress={loadUser}
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

  const { user, store } = state;
  const createdAt = getCreatedAt(user);
  const storeLabel = getStoreLabel(user, store);

  return (
    <SafeAreaView style={styles.safeArea}>
      {appBar}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>User detail</Text>
          <Text style={styles.pageSubtitle}>ID: {user.id.slice(0, 8)}</Text>
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

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Account</Text>
            <Text style={styles.cardHeaderIcon}>♙</Text>
          </View>

          <View style={styles.cardBody}>
            <DetailRow label="FULL NAME" value={user.fullName} />
            <DetailRow label="USERNAME" value={`@${user.username}`} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ROLE</Text>
              <RoleBadge role={user.role} />
            </View>

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
          </View>
        </View>

        {user.storeId ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Assigned store</Text>
            </View>

            <View style={styles.cardBody}>
              <DetailRow
                label="STORE"
                value={store ? store.name : user.storeId.slice(0, 8)}
              />

              {store ? (
                <DetailRow label="ADDRESS" value={store.address} />
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.btnOutline,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => router.push(`/(admin)/stores/${user.storeId}`)}
              >
                <Text style={styles.btnOutlineText}>View store</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {!user.active ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Deactivation</Text>
            </View>

            <View style={styles.cardBody}>
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
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Actions</Text>
          </View>

          <View style={styles.cardBody}>
            {actionErrorMessage ? (
              <ErrorMessage message={actionErrorMessage} />
            ) : null}

            {user.active ? (
              <Pressable
                style={({ pressed }) => [
                  styles.btnDanger,
                  (pressed || isDeactivating) && styles.buttonPressed,
                ]}
                onPress={confirmDeactivateUser}
                disabled={isDeactivating}
              >
                <Text style={styles.btnDangerText}>
                  {isDeactivating ? "Deactivating…" : "♙ Deactivate user"}
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.inactiveHelpText}>
                This user has already been deactivated.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.btnRefresh,
              pressed && styles.buttonPressed,
            ]}
            onPress={loadUser}
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
    gap: 16,
  },
  menuIcon: {
    fontSize: 20,
    color: colors.primary,
  },
  appBarTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#283044",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  avatarText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.surface,
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
    fontSize: fontSize.base,
    color: colors.textMuted,
    lineHeight: 20,
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
    fontWeight: fontWeight.semibold,
  },
  statusBannerTextActive: {
    color: colors.primary,
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
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  cardHeaderIcon: {
    fontSize: fontSize.xxl,
    color: colors.textSubtle,
    opacity: 0.5,
  },
  cardBody: {
    padding: 16,
    gap: 18,
  },
  detailRow: {
    gap: 5,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSubtle,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    lineHeight: 21,
  },
  activeValue: {
    color: colors.primary,
  },
  inactiveValue: {
    color: colors.warning,
  },
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
  inactiveHelpText: {
    fontSize: fontSize.base,
    lineHeight: 20,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 4,
  },
  btnDanger: {
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  btnDangerText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.danger,
  },
  btnRefresh: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.secondarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRefreshText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.secondaryDark,
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