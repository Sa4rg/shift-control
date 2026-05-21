import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { getStoreById } from "@/src/api/stores";
import { getUserById } from "@/src/api/users";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import type { AdminUser, Store } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";

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

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
      const user = await getUserById(userId);

      let store: Store | null = null;

      if (user.storeId) {
        try {
          store = await getStoreById(user.storeId);
        } catch {
          store = null;
        }
      }

      setState({
        status: "ready",
        user,
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

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  if (state.status === "loading") {
    return <LoadingState message="Loading user..." />;
  }

  if (state.status === "error") {
    return (
      <Screen>
        <View style={styles.container}>
          <Text style={styles.title}>User detail</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Could not load user</Text>
            <ErrorMessage message={state.errorMessage} />
            <Button title="Try again" onPress={loadUser} />
            <Button title="Back" onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  const { user, store } = state;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>User detail</Text>
          <Text style={styles.subtitle}>User {user.id.slice(0, 8)}</Text>
        </View>

        <View style={user.active ? styles.successCard : styles.warningCard}>
          <Text style={user.active ? styles.successTitle : styles.warningTitle}>
            {user.active ? "Active user" : "Inactive user"}
          </Text>
          <Text style={user.active ? styles.successText : styles.warningText}>
            {user.active
              ? "This user can access the mobile app according to their role."
              : "This user is inactive and should not be used for operations."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{user.fullName}</Text>

          <DetailRow label="Username" value={user.username} />
          <DetailRow label="Email" value={user.email} />
          <DetailRow label="Role" value={user.role} />
          <DetailRow label="Status" value={user.active ? "Active" : "Inactive"} />
        </View>

        {user.storeId ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Assigned store</Text>

            <DetailRow
              label="Store"
              value={store ? store.name : user.storeId.slice(0, 8)}
            />
            {store ? <DetailRow label="Address" value={store.address} /> : null}

            <Button
              title="View store"
              onPress={() => router.push(`/(admin)/stores/${user.storeId}`)}
            />
          </View>
        ) : null}

        {!user.active ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Deactivation</Text>

            <DetailRow label="Deactivated by" value={user.deactivatedByName} />
            <DetailRow
              label="Deactivated at"
              value={
                user.deactivatedAt ? formatDateTime(user.deactivatedAt) : null
              }
            />
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button title="Refresh" onPress={loadUser} />
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
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  detailLabel: {
    flex: 1,
    fontSize: 16,
    color: "#555555",
  },
  detailValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
  },
  successCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#9bd49b",
    borderRadius: 16,
    padding: 20,
    backgroundColor: "#edf9ed",
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f6b1f",
  },
  successText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1f6b1f",
  },
  warningCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#f0d28a",
    borderRadius: 16,
    padding: 20,
    backgroundColor: "#fff8e5",
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#7a5200",
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#7a5200",
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
});