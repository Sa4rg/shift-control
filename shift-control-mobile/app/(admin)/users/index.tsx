import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { listUsers } from "@/src/api/users";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
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

function UserRow({ user }: { user: AdminUser }) {
  return (
    <Pressable
      style={styles.userRow}
      onPress={() => router.push(`/(admin)/users/${user.id}`)}
    >
      <View style={styles.userMain}>
        <Text style={styles.userTitle}>{user.fullName}</Text>
        <Text style={styles.userMeta}>
          {user.username} · {user.role}
        </Text>
        <Text style={styles.userMeta}>
          {user.active ? "Active" : "Inactive"}
          {user.storeId ? ` · Store ${user.storeId.slice(0, 8)}` : ""}
        </Text>
      </View>

      <Text style={styles.userAction}>View</Text>
    </Pressable>
  );
}

export default function AdminUsersScreen() {
  const [state, setState] = useState<UsersState>({
    status: "loading",
    users: [],
    errorMessage: null,
  });

  const loadUsers = useCallback(async () => {
    setState({
      status: "loading",
      users: [],
      errorMessage: null,
    });

    try {
      const users = await listUsers();

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
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadUsers();
    }, [loadUsers])
  );

  const adminUsers = useMemo(
    () =>
      state.status === "ready"
        ? state.users.filter((user) => user.role === "ADMIN")
        : [],
    [state]
  );

  const staffUsers = useMemo(
    () =>
      state.status === "ready"
        ? state.users.filter((user) => user.role === "STAFF")
        : [],
    [state]
  );

  if (state.status === "loading") {
    return <LoadingState message="Loading users..." />;
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Users</Text>
          <Text style={styles.subtitle}>
            Review admin and staff accounts.
          </Text>
        </View>

        {state.status === "error" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Could not load users</Text>
            <ErrorMessage message={state.errorMessage} />
            <Button title="Try again" onPress={loadUsers} />
          </View>
        ) : null}

        {state.status === "ready" && state.users.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No users found</Text>
            <Text style={styles.body}>There are no users registered yet.</Text>
          </View>
        ) : null}

        {staffUsers.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Staff</Text>
            {staffUsers.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </View>
        ) : null}

        {adminUsers.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Admins</Text>
            {adminUsers.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
        <Button
            title="Create staff"
            onPress={() => router.push("/(admin)/users/new-staff")}
        />
        <Button title="Refresh" onPress={loadUsers} />
        <Button title="Back" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    padding: 24,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    color: "#555555",
    lineHeight: 22,
  },
  card: {
    gap: 12,
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  userMain: {
    gap: 4,
  },
  userTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  userMeta: {
    fontSize: 14,
    color: "#666666",
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
  userAction: {
    fontSize: 14,
    fontWeight: "700",
  },
});