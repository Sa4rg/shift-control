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
import { listUsers } from "@/src/api/users";
import { createWeeklyReview } from "@/src/api/weeklyReviews";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import { TextField } from "@/src/components/TextField";
import type {
  AdminUser,
  Store,
  WeeklyAdminReviewStatus,
} from "@/src/types/api";

type ReferenceDataState =
  | {
      status: "loading";
      stores: Store[];
      staffUsers: AdminUser[];
      errorMessage: null;
    }
  | {
      status: "ready";
      stores: Store[];
      staffUsers: AdminUser[];
      errorMessage: null;
    }
  | {
      status: "error";
      stores: Store[];
      staffUsers: AdminUser[];
      errorMessage: string;
    };

const REVIEW_STATUSES: WeeklyAdminReviewStatus[] = [
  "REVIEWED_OK",
  "REVIEWED_WITH_INCIDENT",
];

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime());
}

export default function NewWeeklyReviewScreen() {
  const [referenceDataState, setReferenceDataState] =
    useState<ReferenceDataState>({
      status: "loading",
      stores: [],
      staffUsers: [],
      errorMessage: null,
    });

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState("");
  const [status, setStatus] =
    useState<WeeklyAdminReviewStatus>("REVIEWED_OK");
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeStores = useMemo(
    () =>
      referenceDataState.status === "ready"
        ? referenceDataState.stores.filter((store) => store.active)
        : [],
    [referenceDataState]
  );

  const staffForSelectedStore = useMemo(
    () =>
      referenceDataState.status === "ready" && selectedStoreId
        ? referenceDataState.staffUsers.filter(
            (user) => user.active && user.storeId === selectedStoreId
          )
        : [],
    [referenceDataState, selectedStoreId]
  );

  const selectedStore = useMemo(
    () =>
      activeStores.find((store) => store.id === selectedStoreId) ?? null,
    [activeStores, selectedStoreId]
  );

  const selectedStaff = useMemo(
    () =>
      staffForSelectedStore.find((user) => user.id === selectedStaffId) ?? null,
    [staffForSelectedStore, selectedStaffId]
  );

  const canSubmit =
    selectedStoreId !== null &&
    selectedStaffId !== null &&
    isValidIsoDate(weekStart) &&
    !isSubmitting;

  const loadReferenceData = useCallback(async () => {
    setReferenceDataState({
      status: "loading",
      stores: [],
      staffUsers: [],
      errorMessage: null,
    });

    try {
      const [stores, users] = await Promise.all([
        listStores(),
        listUsers({ role: "STAFF" }),
      ]);

      const activeStoresResult = stores.filter((store) => store.active);
      const activeStaffResult = users.filter(
        (user) => user.role === "STAFF" && user.active
      );

      setReferenceDataState({
        status: "ready",
        stores: activeStoresResult,
        staffUsers: activeStaffResult,
        errorMessage: null,
      });

      if (!selectedStoreId && activeStoresResult.length > 0) {
        const firstStore = activeStoresResult[0];
        setSelectedStoreId(firstStore.id);

        const firstStaffForStore = activeStaffResult.find(
          (user) => user.storeId === firstStore.id
        );

        if (firstStaffForStore) {
          setSelectedStaffId(firstStaffForStore.id);
        }
      }
    } catch (error) {
      setReferenceDataState({
        status: "error",
        stores: [],
        staffUsers: [],
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, [selectedStoreId]);

  useFocusEffect(
    useCallback(() => {
      void loadReferenceData();
    }, [loadReferenceData])
  );

  function handleSelectStore(storeId: string) {
    setSelectedStoreId(storeId);

    if (referenceDataState.status !== "ready") {
      setSelectedStaffId(null);
      return;
    }

    const firstStaffForStore = referenceDataState.staffUsers.find(
      (user) => user.active && user.storeId === storeId
    );

    setSelectedStaffId(firstStaffForStore?.id ?? null);
  }

  async function handleSubmit() {
    if (!canSubmit || !selectedStoreId || !selectedStaffId) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createWeeklyReview({
        storeId: selectedStoreId,
        staffId: selectedStaffId,
        weekStart,
        status,
        note: note.trim().length > 0 ? note.trim() : undefined,
      });

      router.replace("/(admin)/weekly-reviews");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (referenceDataState.status === "loading") {
    return <LoadingState message="Loading review data..." />;
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Create weekly review</Text>
            <Text style={styles.subtitle}>
              Create a weekly admin snapshot for a store and staff member.
            </Text>
          </View>

          {referenceDataState.status === "error" ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Could not load data</Text>
              <ErrorMessage message={referenceDataState.errorMessage} />
              <Button title="Try again" onPress={loadReferenceData} />
            </View>
          ) : null}

          {referenceDataState.status === "ready" && activeStores.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No active stores</Text>
              <Text style={styles.body}>
                Create or activate a store before creating weekly reviews.
              </Text>
            </View>
          ) : null}

          {referenceDataState.status === "ready" && activeStores.length > 0 ? (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Store</Text>

                <View style={styles.options}>
                  {activeStores.map((store) => (
                    <Button
                      key={store.id}
                      title={
                        store.id === selectedStoreId
                          ? `✓ ${store.name}`
                          : store.name
                      }
                      onPress={() => handleSelectStore(store.id)}
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

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Staff</Text>

                {staffForSelectedStore.length === 0 ? (
                  <Text style={styles.body}>
                    No active staff users found for this store.
                  </Text>
                ) : (
                  <View style={styles.options}>
                    {staffForSelectedStore.map((staff) => (
                      <Button
                        key={staff.id}
                        title={
                          staff.id === selectedStaffId
                            ? `✓ ${staff.fullName}`
                            : staff.fullName
                        }
                        onPress={() => setSelectedStaffId(staff.id)}
                        disabled={isSubmitting}
                      />
                    ))}
                  </View>
                )}

                {selectedStaff ? (
                  <Text style={styles.helpText}>
                    Selected staff: {selectedStaff.fullName}
                  </Text>
                ) : null}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Review details</Text>

                <TextField
                  label="Week start"
                  value={weekStart}
                  onChangeText={setWeekStart}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                />

                {weekStart.length > 0 && !isValidIsoDate(weekStart) ? (
                  <Text style={styles.helpText}>
                    Week start must use YYYY-MM-DD format.
                  </Text>
                ) : null}

                <Text style={styles.helpText}>
                  The server will calculate week end as week start + 6 days.
                </Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Review status</Text>

                <View style={styles.options}>
                  {REVIEW_STATUSES.map((option) => (
                    <Button
                      key={option}
                      title={option === status ? `✓ ${option}` : option}
                      onPress={() => setStatus(option)}
                      disabled={isSubmitting}
                    />
                  ))}
                </View>

                <TextField
                  label="Note"
                  value={note}
                  onChangeText={setNote}
                  placeholder="Optional"
                  autoCapitalize="sentences"
                />
              </View>

              <ErrorMessage message={errorMessage} />

              <View style={styles.actions}>
                <Button
                  title="Create weekly review"
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