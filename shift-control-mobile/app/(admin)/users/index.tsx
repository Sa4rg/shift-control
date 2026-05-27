import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { listUsers } from "@/src/api/users";
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type { AdminUser } from "@/src/types/api";
import { colors, fontWeight, fontSize, shadows, radius } from "@/src/theme";

type UsersState =
  | {
      status: "loading";
      users: AdminUser[];
      errorMessage: null;
    }
  | {
      status: "ready";
      users: AdminUser[];
      errorMessage: null;
    }
  | {
      status: "error";
      users: AdminUser[];
      errorMessage: string;
    };

function getUserStoreLabel(user: AdminUser): string {
  const userWithOptionalStore = user as AdminUser & {
    storeName?: string | null;
  };

  if (user.role === "ADMIN") {
    return "All Stores";
  }

  if (userWithOptionalStore.storeName) {
    return userWithOptionalStore.storeName;
  }

  if (user.storeId) {
    return `Store ${user.storeId.slice(0, 8)}`;
  }

  return "No store assigned";
}

function UserStatusBadge({ active }: { active: boolean }) {
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

function UserRow({ user, isLast }: { user: AdminUser; isLast: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.userRow,
        isLast && styles.userRowLast,
        !user.active && styles.userRowInactive,
        pressed && styles.rowPressed,
      ]}
      onPress={() => router.push(`/(admin)/users/${user.id}`)}
    >
      <View style={styles.userMain}>
        <View style={styles.userTitleRow}>
          <Text style={styles.userTitle}>{user.fullName}</Text>
          <UserStatusBadge active={user.active} />
        </View>

        <Text style={styles.userMeta}>
          {user.username} · {user.role === "ADMIN" ? "Admin" : "Staff"}
        </Text>

        <Text style={styles.userStore}>{getUserStoreLabel(user)}</Text>
      </View>

      <View style={styles.userActionGroup}>
        <Text style={styles.userAction}>View</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

export default function AdminUsersScreen() {
  const { user } = useAuth();

  const [state, setState] = useState<UsersState>({
    status: "loading",
    users: [],
    errorMessage: null,
  });

  const [includeInactiveUsers, setIncludeInactiveUsers] = useState(false);

  const loadUsers = useCallback(async () => {
    setState({
      status: "loading",
      users: [],
      errorMessage: null,
    });

    try {
      const users = await listUsers({ includeInactive: includeInactiveUsers });

      setState({
        status: "ready",
        users,
        errorMessage: null,
      });
    } catch (error) {
      setState({
        status: "error",
        users: [],
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, [includeInactiveUsers]);

  useFocusEffect(
    useCallback(() => {
      void loadUsers();
    }, [loadUsers])
  );

  const adminUsers = useMemo(
    () =>
      state.status === "ready"
        ? state.users.filter((adminUser) => adminUser.role === "ADMIN")
        : [],
    [state]
  );

  const staffUsers = useMemo(
    () =>
      state.status === "ready"
        ? state.users.filter((adminUser) => adminUser.role === "STAFF")
        : [],
    [state]
  );

  const activeCount =
    state.status === "ready"
      ? state.users.filter((adminUser) => adminUser.active).length
      : 0;

  const inactiveCount =
    state.status === "ready"
      ? state.users.filter((adminUser) => !adminUser.active).length
      : 0;

  const displayName = user?.fullName ?? user?.username ?? "Admin";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (state.status === "loading") {
    return <LoadingState message="Loading users..." />;
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
          <Text style={styles.pageTitle}>Users</Text>
          <Text style={styles.pageSubtitle}>
            Review admin and staff accounts.
          </Text>
        </View>

        <View style={styles.filterCard}>
          <View style={styles.filterOptions}>
            <Pressable
              style={[
                styles.filterChip,
                !includeInactiveUsers && styles.filterChipActive,
              ]}
              onPress={() => setIncludeInactiveUsers(false)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  !includeInactiveUsers && styles.filterChipTextActive,
                ]}
              >
                Active only
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.filterChip,
                includeInactiveUsers && styles.filterChipActive,
              ]}
              onPress={() => setIncludeInactiveUsers(true)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  includeInactiveUsers && styles.filterChipTextActive,
                ]}
              >
                Include inactive
              </Text>
            </Pressable>
          </View>

          {state.status === "ready" ? (
            <Text style={styles.userSummary}>
              ⓘ Active: {activeCount} · Inactive: {inactiveCount}
            </Text>
          ) : null}
        </View>

        {state.status === "error" ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Could not load users</Text>
            </View>

            <View style={styles.cardBody}>
              <ErrorMessage message={state.errorMessage} />

              <Pressable
                style={({ pressed }) => [
                  styles.btnOutline,
                  pressed && styles.buttonPressed,
                ]}
                onPress={loadUsers}
              >
                <Text style={styles.btnOutlineText}>Try again</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {state.status === "ready" && state.users.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptyText}>
              There are no users matching the current visibility filter.
            </Text>
          </View>
        ) : null}

        {adminUsers.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ADMINS</Text>

            <View style={styles.listCard}>
              {adminUsers.map((adminUser, index) => (
                <UserRow
                  key={adminUser.id}
                  user={adminUser}
                  isLast={index === adminUsers.length - 1}
                />
              ))}
            </View>
          </View>
        ) : null}

        {staffUsers.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>STAFF</Text>

            <View style={styles.listCard}>
              {staffUsers.map((staffUser, index) => (
                <UserRow
                  key={staffUser.id}
                  user={staffUser}
                  isLast={index === staffUsers.length - 1}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.btnPrimary,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push("/(admin)/users/new-staff")}
          >
            <Text style={styles.btnPrimaryText}>♙ Create staff</Text>
          </Pressable>

          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.btnRefresh,
                pressed && styles.buttonPressed,
              ]}
              onPress={loadUsers}
            >
              <Text style={styles.btnRefreshText}>⟳ Refresh</Text>
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
    fontSize: fontSize.lg,
    color: colors.textMuted,
    lineHeight: 22,
  },
  filterCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
    ...shadows.card,
  },
  filterOptions: {
    flexDirection: "row",
    gap: 8,
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
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  userSummary: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 18,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extrabold,
    color: colors.textSubtle,
    letterSpacing: 1,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.card,
  },
  userRow: {
    minHeight: 88,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  userRowLast: {
    borderBottomWidth: 0,
  },
  userRowInactive: {
    opacity: 0.72,
  },
  userMain: {
    flex: 1,
    gap: 5,
  },
  userTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  userTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  userMeta: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  userStore: {
    fontSize: fontSize.sm,
    color: colors.textSubtle,
    fontWeight: fontWeight.semibold,
  },
  statusBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeActive: {
    backgroundColor: colors.primaryMuted,
  },
  statusBadgeInactive: {
    backgroundColor: "#dae2fd",
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
  userActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  userAction: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  chevron: {
    fontSize: 22,
    color: colors.primary,
    marginTop: -1,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
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
    gap: 12,
  },
  emptyCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 6,
  },
  emptyTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  emptyText: {
    fontSize: fontSize.base,
    lineHeight: 20,
    color: colors.textMuted,
  },
  actions: {
    gap: 10,
    paddingTop: 6,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  btnPrimary: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primaryButton,
  },
  btnPrimaryText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.extrabold,
    color: colors.surface,
    letterSpacing: 0.2,
  },
  btnRefresh: {
    flex: 1,
    height: 48,
    backgroundColor: "#89f5e7",
    borderRadius: radius.lg,
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  btnBackText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  btnOutline: {
    height: 44,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
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
});