import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { listStores } from "@/src/api/stores";
import { createStaff } from "@/src/api/users";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import { TextField } from "@/src/components/TextField";
import type { Store } from "@/src/types/api";

type StoresState =
  | {
      status: "loading";
      stores: Store[];
      errorMessage: null;
    }
  | {
      status: "ready";
      stores: Store[];
      errorMessage: null;
    }
  | {
      status: "error";
      stores: Store[];
      errorMessage: string;
    };

function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

export default function NewStaffScreen() {
  const [storesState, setStoresState] = useState<StoresState>({
    status: "loading",
    stores: [],
    errorMessage: null,
  });

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedStore = useMemo(
    () =>
      storesState.status === "ready"
        ? storesState.stores.find((store) => store.id === selectedStoreId) ??
          null
        : null,
    [storesState, selectedStoreId]
  );

  const canSubmit =
    fullName.trim().length > 0 &&
    username.trim().length > 0 &&
    isValidPin(pin) &&
    selectedStoreId !== null &&
    !isSubmitting;

  const loadStores = useCallback(async () => {
    setStoresState({
      status: "loading",
      stores: [],
      errorMessage: null,
    });

    try {
      const stores = await listStores();

      setStoresState({
        status: "ready",
        stores: stores.filter((store) => store.active),
        errorMessage: null,
      });

      if (!selectedStoreId && stores.length > 0) {
        const firstActiveStore = stores.find((store) => store.active);

        if (firstActiveStore) {
          setSelectedStoreId(firstActiveStore.id);
        }
      }
    } catch (error) {
      setStoresState({
        status: "error",
        stores: [],
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, [selectedStoreId]);

  useFocusEffect(
    useCallback(() => {
      void loadStores();
    }, [loadStores])
  );

  async function handleSubmit() {
    if (!canSubmit || !selectedStoreId) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createStaff({
        fullName: fullName.trim(),
        username: username.trim(),
        pin,
        storeId: selectedStoreId,
      });

      router.replace("/(admin)/users");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (storesState.status === "loading") {
    return <LoadingState message="Loading stores..." />;
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Create staff</Text>
            <Text style={styles.subtitle}>
              Create a staff account with a 6-digit PIN and assigned store.
            </Text>
          </View>

          {storesState.status === "error" ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Could not load stores</Text>
              <ErrorMessage message={storesState.errorMessage} />
              <Button title="Try again" onPress={loadStores} />
            </View>
          ) : null}

          {storesState.status === "ready" && storesState.stores.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No active stores</Text>
              <Text style={styles.body}>
                Create or activate a store before creating staff users.
              </Text>
            </View>
          ) : null}

          {storesState.status === "ready" && storesState.stores.length > 0 ? (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Staff information</Text>

                <TextField
                  label="Full name"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Example: Sara Staff"
                  autoCapitalize="words"
                />

                <TextField
                  label="Username"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Example: sara.staff"
                  autoCapitalize="none"
                />

                <TextField
                  label="PIN"
                  value={pin}
                  onChangeText={setPin}
                  placeholder="6 digits"
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                />

                {pin.length > 0 && !isValidPin(pin) ? (
                  <Text style={styles.helpText}>
                    PIN must be exactly 6 digits.
                  </Text>
                ) : null}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Assigned store</Text>

                <View style={styles.options}>
                  {storesState.stores.map((store) => (
                    <Button
                      key={store.id}
                      title={
                        store.id === selectedStoreId
                          ? `✓ ${store.name}`
                          : store.name
                      }
                      onPress={() => setSelectedStoreId(store.id)}
                      disabled={isSubmitting}
                    />
                  ))}
                </View>

                {selectedStore ? (
                  <Text style={styles.helpText}>
                    Selected store: {selectedStore.name}
                  </Text>
                ) : null}
              </View>

              <ErrorMessage message={errorMessage} />

              <View style={styles.actions}>
                <Button
                  title="Create staff"
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  disabled={!canSubmit}
                />

                <Button
                  title="Cancel"
                  onPress={() => router.back()}
                  disabled={isSubmitting}
                />
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
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
  options: {
    gap: 8,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#555555",
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
});