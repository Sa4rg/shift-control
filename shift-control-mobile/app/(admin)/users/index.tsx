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
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Section, StatusBadge } from "@/src/components/ui";
import type { AdminUser } from "@/src/types/api";
import { colors, commonStyles, fontWeight, fontSize, radius } from "@/src/theme";

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

function UserRow({ user, isLast }: { user: AdminUser; isLast: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [
        commonStyles.listRow,
        isLast && commonStyles.listRowLast,
        !user.active && commonStyles.listRowInactive,
        pressed && commonStyles.rowPressed,
      ]}
      onPress={() => router.push(`/(admin)/users/${user.id}`)}
    >
      <View style={styles.userMain}>
        <View style={styles.userTitleRow}>
          <Text style={styles.userTitle}>{user.fullName}</Text>
          <StatusBadge active={user.active} />
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

  if (state.status === "loading") {
    return <LoadingState message="Loading users..." />;
  }

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <AppTopBar variant="back" />

      <ScrollView
        contentContainerStyle={commonStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={commonStyles.pageHeader}>
          <Text style={commonStyles.pageTitle}>Users</Text>
          <Text style={commonStyles.pageSubtitle}>
            Review admin and staff accounts.
          </Text>
        </View>

        <View style={commonStyles.filterCard}>
          <View style={commonStyles.filterOptions}>
            <Pressable
              style={[
                commonStyles.chip,
                !includeInactiveUsers && commonStyles.chipActive,
              ]}
              onPress={() => setIncludeInactiveUsers(false)}
            >
              <Text
                style={[
                  commonStyles.chipText,
                  !includeInactiveUsers && commonStyles.chipTextActive,
                ]}
              >
                Active only
              </Text>
            </Pressable>

            <Pressable
              style={[
                commonStyles.chip,
                includeInactiveUsers && commonStyles.chipActive,
              ]}
              onPress={() => setIncludeInactiveUsers(true)}
            >
              <Text
                style={[
                  commonStyles.chipText,
                  includeInactiveUsers && commonStyles.chipTextActive,
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
          <View style={commonStyles.card}>
            <View style={commonStyles.cardHeader}>
              <Text style={commonStyles.cardTitle}>Could not load users</Text>
            </View>

            <View style={commonStyles.cardBody}>
              <ErrorMessage message={state.errorMessage} />

              <Pressable
                style={({ pressed }) => [
                  commonStyles.outlineButton,
                  pressed && commonStyles.buttonPressed,
                ]}
                onPress={loadUsers}
              >
                <Text style={commonStyles.outlineButtonText}>Try again</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {state.status === "ready" && state.users.length === 0 ? (
          <View style={commonStyles.emptyCard}>
            <Text style={commonStyles.emptyTitle}>No users found</Text>
            <Text style={commonStyles.emptyText}>
              There are no users matching the current visibility filter.
            </Text>
          </View>
        ) : null}

        {adminUsers.length > 0 ? (
          <Section title="ADMINS">
            <View style={commonStyles.listCard}>
              {adminUsers.map((adminUser, index) => (
                <UserRow
                  key={adminUser.id}
                  user={adminUser}
                  isLast={index === adminUsers.length - 1}
                />
              ))}
            </View>
          </Section>
        ) : null}

        {staffUsers.length > 0 ? (
          <Section title="STAFF">
            <View style={commonStyles.listCard}>
              {staffUsers.map((staffUser, index) => (
                <UserRow
                  key={staffUser.id}
                  user={staffUser}
                  isLast={index === staffUsers.length - 1}
                />
              ))}
            </View>
          </Section>
        ) : null}

        <View style={commonStyles.actions}>
          <Pressable
            style={({ pressed }) => [
              commonStyles.primaryButton,
              pressed && commonStyles.buttonPressed,
            ]}
            onPress={() => router.push("/(admin)/users/new-staff")}
          >
            <Text style={commonStyles.primaryButtonText}>♙ Create staff</Text>
          </Pressable>

          <View style={commonStyles.actions}>
            <Pressable
              style={({ pressed }) => [
                commonStyles.btnRefresh,
                pressed && commonStyles.buttonPressed,
              ]}
              onPress={loadUsers}
            >
              <Text style={commonStyles.btnRefreshText}>⟳ Refresh</Text>
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

const styles = StyleSheet.create({
  // Summary text específico de filter
  userSummary: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 18,
  },

  // UserRow específico (detalles internos del row)
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

  // Container local para el botón Create + actions row
});