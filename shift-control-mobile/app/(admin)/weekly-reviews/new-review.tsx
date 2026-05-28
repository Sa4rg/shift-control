import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { listStores } from "@/src/api/stores";
import { listUsers } from "@/src/api/users";
import { createWeeklyReview } from "@/src/api/weeklyReviews";
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type {
  AdminUser,
  Store,
  WeeklyAdminReviewStatus,
} from "@/src/types/api";
import { colors, fontWeight, fontSize, shadows, radius } from "@/src/theme";

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

function getStatusLabel(status: WeeklyAdminReviewStatus): string {
  return status === "REVIEWED_OK" ? "REVIEWED OK" : "INCIDENT";
}

function StoreOption({
  store,
  selected,
  disabled,
  onPress,
}: {
  store: Store;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.storeOption,
        selected && styles.storeOptionSelected,
        pressed && !disabled && styles.buttonPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.storeOptionContent}>
        <Text
          style={[
            styles.storeOptionText,
            selected && styles.storeOptionTextSelected,
          ]}
        >
          {store.name}
        </Text>

        {store.address ? (
          <Text style={styles.storeAddress}>{store.address}</Text>
        ) : null}
      </View>

      {selected ? (
        <View style={styles.checkCircle}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function StaffChip({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.staffChip,
        selected && styles.staffChipSelected,
        pressed && !disabled && styles.buttonPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.staffChipText,
          selected && styles.staffChipTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function StatusOption({
  status,
  selected,
  disabled,
  onPress,
}: {
  status: WeeklyAdminReviewStatus;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const isOk = status === "REVIEWED_OK";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.statusOption,
        selected && styles.statusOptionSelected,
        pressed && !disabled && styles.buttonPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View
        style={[
          styles.statusIcon,
          selected && styles.statusIconSelected,
          !isOk && styles.statusIconIncident,
          selected && !isOk && styles.statusIconIncidentSelected,
        ]}
      >
        <Text
          style={[
            styles.statusIconText,
            selected && styles.statusIconTextSelected,
          ]}
        >
          {isOk ? "✓" : "!"}
        </Text>
      </View>

      <Text
        style={[
          styles.statusOptionText,
          selected && styles.statusOptionTextSelected,
        ]}
      >
        {getStatusLabel(status)}
      </Text>
    </Pressable>
  );
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
            (staffUser) =>
              staffUser.active &&
              staffUser.role === "STAFF" &&
              staffUser.storeId === selectedStoreId
          )
        : [],
    [referenceDataState, selectedStoreId]
  );

  const selectedStore = useMemo(
    () => activeStores.find((store) => store.id === selectedStoreId) ?? null,
    [activeStores, selectedStoreId]
  );

  const selectedStaff = useMemo(
    () =>
      staffForSelectedStore.find(
        (staffUser) => staffUser.id === selectedStaffId
      ) ?? null,
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
        (staffUser) => staffUser.role === "STAFF" && staffUser.active
      );

      setReferenceDataState({
        status: "ready",
        stores: activeStoresResult,
        staffUsers: activeStaffResult,
        errorMessage: null,
      });

      setSelectedStoreId((currentStoreId) => {
        if (
          currentStoreId &&
          activeStoresResult.some((store) => store.id === currentStoreId)
        ) {
          return currentStoreId;
        }

        const firstStore = activeStoresResult[0];

        return firstStore?.id ?? null;
      });
    } catch (error) {
      setReferenceDataState({
        status: "error",
        stores: [],
        staffUsers: [],
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadReferenceData();
    }, [loadReferenceData])
  );

  useMemo(() => {
    if (referenceDataState.status !== "ready" || !selectedStoreId) {
      return;
    }

    setSelectedStaffId((currentStaffId) => {
      if (
        currentStaffId &&
        referenceDataState.staffUsers.some(
          (staffUser) =>
            staffUser.id === currentStaffId &&
            staffUser.active &&
            staffUser.storeId === selectedStoreId
        )
      ) {
        return currentStaffId;
      }

      const firstStaffForStore = referenceDataState.staffUsers.find(
        (staffUser) => staffUser.active && staffUser.storeId === selectedStoreId
      );

      return firstStaffForStore?.id ?? null;
    });
  }, [referenceDataState, selectedStoreId]);

  function handleSelectStore(storeId: string) {
    setSelectedStoreId(storeId);

    if (referenceDataState.status !== "ready") {
      setSelectedStaffId(null);
      return;
    }

    const firstStaffForStore = referenceDataState.staffUsers.find(
      (staffUser) => staffUser.active && staffUser.storeId === storeId
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
    <SafeAreaView style={styles.safeArea}>
      <AppTopBar variant="back" />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>New weekly review</Text>
            <Text style={styles.pageSubtitle}>
              Create a new performance audit for a store and staff member.
            </Text>
          </View>

          {referenceDataState.status === "error" ? (
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <Text style={styles.sectionTitle}>Could not load data</Text>
                <ErrorMessage message={referenceDataState.errorMessage} />

                <Pressable
                  style={({ pressed }) => [
                    styles.btnOutline,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={loadReferenceData}
                >
                  <Text style={styles.btnOutlineText}>Try again</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {referenceDataState.status === "ready" && activeStores.length === 0 ? (
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <Text style={styles.sectionTitle}>No active stores</Text>
                <Text style={styles.bodyText}>
                  Create or activate a store before creating weekly reviews.
                </Text>
              </View>
            </View>
          ) : null}

          {referenceDataState.status === "ready" && activeStores.length > 0 ? (
            <>
              <View style={styles.card}>
                <View style={styles.cardBody}>
                  <Text style={styles.sectionTitle}>Store</Text>

                  <View style={styles.storeList}>
                    {activeStores.map((store) => (
                      <StoreOption
                        key={store.id}
                        store={store}
                        selected={store.id === selectedStoreId}
                        disabled={isSubmitting}
                        onPress={() => handleSelectStore(store.id)}
                      />
                    ))}
                  </View>

                  {selectedStore ? (
                    <Text style={styles.helperText}>
                      Selected store: {selectedStore.name}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardBody}>
                  <Text style={styles.sectionTitle}>Staff member</Text>

                  {staffForSelectedStore.length === 0 ? (
                    <Text style={styles.bodyText}>
                      No active staff users found for this store.
                    </Text>
                  ) : (
                    <View style={styles.staffChips}>
                      {staffForSelectedStore.map((staffUser) => (
                        <StaffChip
                          key={staffUser.id}
                          label={staffUser.fullName}
                          selected={staffUser.id === selectedStaffId}
                          disabled={isSubmitting}
                          onPress={() => setSelectedStaffId(staffUser.id)}
                        />
                      ))}
                    </View>
                  )}

                  {selectedStaff ? (
                    <Text style={styles.helperText}>
                      Selected staff: {selectedStaff.fullName}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardBody}>
                  <Text style={styles.sectionTitle}>Week start date</Text>

                  <TextInput
                    style={[
                      styles.input,
                      weekStart.length > 0 &&
                        !isValidIsoDate(weekStart) &&
                        styles.inputError,
                    ]}
                    value={weekStart}
                    onChangeText={setWeekStart}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#6d7a77"
                    keyboardType="numbers-and-punctuation"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />

                  <Text style={styles.helperText}>
                    Use YYYY-MM-DD format. Monday preferred.
                  </Text>

                  {weekStart.length > 0 && !isValidIsoDate(weekStart) ? (
                    <Text style={styles.validationText}>
                      Week start must use YYYY-MM-DD format.
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardBody}>
                  <Text style={styles.sectionTitle}>Review status</Text>

                  <View style={styles.statusGrid}>
                    {REVIEW_STATUSES.map((option) => (
                      <StatusOption
                        key={option}
                        status={option}
                        selected={option === status}
                        disabled={isSubmitting}
                        onPress={() => setStatus(option)}
                      />
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardBody}>
                  <Text style={styles.sectionTitle}>Review note</Text>

                  <TextInput
                    style={styles.noteInput}
                    value={note}
                    onChangeText={setNote}
                    placeholder="Add any specific observations from this week..."
                    placeholderTextColor="#6d7a77"
                    multiline
                    autoCapitalize="sentences"
                    autoCorrect={false}
                    editable={!isSubmitting}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {errorMessage ? (
                <View style={styles.errorCard}>
                  <ErrorMessage message={errorMessage} />
                </View>
              ) : null}

              <View style={styles.actions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.btnPrimary,
                    !canSubmit && styles.btnDisabled,
                    pressed && canSubmit && styles.buttonPressed,
                  ]}
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                >
                  <Text style={styles.btnPrimaryText}>
                    {isSubmitting ? "Creating…" : "✓ Create review"}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.btnCancel,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => router.back()}
                  disabled={isSubmitting}
                >
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.card,
  },
  cardBody: {
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: "900",
    color: colors.textMuted,
    letterSpacing: 0.9,
  },
  storeList: {
    gap: 8,
  },
  storeOption: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  storeOptionSelected: {
    borderWidth: 1.5,
    borderColor: "#00685f",
    backgroundColor: "#f2fffc",
  },
  storeOptionContent: {
    flex: 1,
    gap: 3,
  },
  storeOptionText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  storeOptionTextSelected: {
    color: colors.primary,
  },
  storeAddress: {
    fontSize: fontSize.sm,
    color: colors.textSubtle,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: {
    fontSize: fontSize.md,
    fontWeight: "900",
    color: colors.surface,
  },
  staffChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  staffChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  staffChipSelected: {
    borderWidth: 1.5,
    borderColor: "#00685f",
    backgroundColor: "#f2fffc",
  },
  staffChipText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extrabold,
    color: colors.textMuted,
  },
  staffChipTextSelected: {
    color: colors.primary,
  },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.danger,
  },
  helperText: {
    fontSize: fontSize.sm,
    lineHeight: 18,
    color: colors.textSubtle,
  },
  validationText: {
    fontSize: fontSize.sm,
    lineHeight: 18,
    color: colors.danger,
  },
  statusGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statusOption: {
    flex: 1,
    minHeight: 76,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: 10,
  },
  statusOptionSelected: {
    borderWidth: 1.5,
    borderColor: "#00685f",
    backgroundColor: "#f2fffc",
  },
  statusIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  statusIconSelected: {
    backgroundColor: colors.primary,
  },
  statusIconIncident: {
    backgroundColor: colors.warningSoft,
  },
  statusIconIncidentSelected: {
    backgroundColor: "#825100",
  },
  statusIconText: {
    fontSize: fontSize.base,
    fontWeight: "900",
    color: colors.textSubtle,
  },
  statusIconTextSelected: {
    color: colors.surface,
  },
  statusOptionText: {
    fontSize: fontSize.sm,
    fontWeight: "900",
    color: colors.textMuted,
    textAlign: "center",
  },
  statusOptionTextSelected: {
    color: colors.primary,
  },
  noteInput: {
    minHeight: 112,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    padding: 14,
    fontSize: fontSize.lg,
    lineHeight: 22,
    color: colors.text,
  },
  bodyText: {
    fontSize: fontSize.base,
    lineHeight: 20,
    color: colors.textMuted,
  },
  errorCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
    backgroundColor: "#fff8f7",
    padding: 14,
  },
  actions: {
    gap: 12,
    paddingTop: 6,
  },
  btnPrimary: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primaryButton,
  },
  btnDisabled: {
    backgroundColor: colors.primaryDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnPrimaryText: {
    fontSize: fontSize.base,
    fontWeight: "900",
    color: colors.surface,
  },
  btnCancel: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancelText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.extrabold,
    color: colors.textMuted,
  },
  btnOutline: {
    height: 46,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: "#00685f",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  btnOutlineText: {
    fontSize: fontSize.base,
    fontWeight: "900",
    color: colors.primary,
  },
  buttonPressed: {
    opacity: 0.72,
  },
});