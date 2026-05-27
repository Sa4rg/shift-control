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
    backgroundColor: "#283044",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bcc9c6",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
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
    fontWeight: "700",
    color: "#131b2e",
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 16,
    color: "#3d4947",
    lineHeight: 22,
  },
  filterCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    padding: 16,
    gap: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  filterOptions: {
    flexDirection: "row",
    gap: 8,
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
    fontWeight: "700",
    color: "#3d4947",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  userSummary: {
    fontSize: 13,
    color: "#3d4947",
    lineHeight: 18,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6d7a77",
    letterSpacing: 1,
  },
  listCard: {
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
  userRow: {
    minHeight: 88,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
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
    fontSize: 16,
    fontWeight: "800",
    color: "#131b2e",
  },
  userMeta: {
    fontSize: 14,
    color: "#3d4947",
  },
  userStore: {
    fontSize: 12,
    color: "#6d7a77",
    fontWeight: "600",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeActive: {
    backgroundColor: "#d2f5f0",
  },
  statusBadgeInactive: {
    backgroundColor: "#dae2fd",
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
  userActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  userAction: {
    fontSize: 14,
    fontWeight: "800",
    color: "#00685f",
  },
  chevron: {
    fontSize: 22,
    color: "#00685f",
    marginTop: -1,
  },
  rowPressed: {
    backgroundColor: "#f2f3ff",
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
    gap: 12,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    backgroundColor: "#ffffff",
    padding: 16,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#131b2e",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#3d4947",
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
    height: 50,
    backgroundColor: "#00685f",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00685f",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.2,
  },
  btnRefresh: {
    flex: 1,
    height: 48,
    backgroundColor: "#89f5e7",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRefreshText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#005049",
  },
  btnBack: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#bcc9c6",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  btnBackText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#3d4947",
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
    fontWeight: "800",
    color: "#00685f",
  },
  buttonPressed: {
    opacity: 0.72,
  },
});