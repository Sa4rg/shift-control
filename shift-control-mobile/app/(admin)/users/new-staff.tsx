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
import { createStaff } from "@/src/api/users";
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { colors, fontWeight, fontSize, shadows, radius } from "@/src/theme";
import { LoadingState } from "@/src/components/LoadingState";
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
  const { user } = useAuth();

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
      const activeStores = stores.filter((store) => store.active);

      setStoresState({
        status: "ready",
        stores: activeStores,
        errorMessage: null,
      });

      setSelectedStoreId((currentStoreId) => {
        if (
          currentStoreId &&
          activeStores.some((store) => store.id === currentStoreId)
        ) {
          return currentStoreId;
        }

        return activeStores[0]?.id ?? null;
      });
    } catch (error) {
      setStoresState({
        status: "error",
        stores: [],
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, []);

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

  function handlePinChange(value: string) {
    setPin(value.replace(/\D/g, "").slice(0, 6));
  }

  const displayName = user?.fullName ?? user?.username ?? "Admin";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (storesState.status === "loading") {
    return <LoadingState message="Loading stores..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <Pressable
            style={({ pressed }) => [
              styles.appBarBackButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.back()}
            disabled={isSubmitting}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>

          <Text style={styles.appBarTitle}>Shift Control</Text>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Create staff</Text>
            <Text style={styles.pageSubtitle}>
              Enter details to create a new staff account.
            </Text>
          </View>

          {storesState.status === "error" ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Could not load stores</Text>
              </View>

              <View style={styles.cardBody}>
                <ErrorMessage message={storesState.errorMessage} />

                <Pressable
                  style={({ pressed }) => [
                    styles.btnOutline,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={loadStores}
                >
                  <Text style={styles.btnOutlineText}>Try again</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {storesState.status === "ready" && storesState.stores.length === 0 ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>No active stores</Text>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.bodyText}>
                  Create or activate a store before creating staff users.
                </Text>
              </View>
            </View>
          ) : null}

          {storesState.status === "ready" && storesState.stores.length > 0 ? (
            <>
              <View style={styles.card}>
                <View style={styles.cardBody}>
                  <Text style={styles.sectionTitle}>Account details</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full name</Text>
                    <TextInput
                      style={styles.input}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="e.g. Maria Silva"
                      placeholderTextColor="#6d7a77"
                      autoCapitalize="words"
                      autoCorrect={false}
                      editable={!isSubmitting}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Username</Text>
                    <TextInput
                      style={styles.input}
                      value={username}
                      onChangeText={setUsername}
                      placeholder="e.g. msilva"
                      placeholderTextColor="#6d7a77"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isSubmitting}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>PIN</Text>
                    <TextInput
                      style={[styles.input, styles.pinInput]}
                      value={pin}
                      onChangeText={handlePinChange}
                      placeholder="••••••"
                      placeholderTextColor="#6d7a77"
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={6}
                      editable={!isSubmitting}
                    />
                  </View>

                  {pin.length > 0 && !isValidPin(pin) ? (
                    <Text style={styles.helpText}>
                      PIN must be exactly 6 digits.
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardBody}>
                  <Text style={styles.sectionTitle}>Store assignment</Text>

                  <View style={styles.storeList}>
                    {storesState.stores.map((store) => {
                      const isSelected = store.id === selectedStoreId;

                      return (
                        <Pressable
                          key={store.id}
                          style={({ pressed }) => [
                            styles.storeOption,
                            isSelected && styles.storeOptionSelected,
                            pressed && styles.buttonPressed,
                          ]}
                          onPress={() => setSelectedStoreId(store.id)}
                          disabled={isSubmitting}
                        >
                          <View style={styles.storeOptionContent}>
                            <Text
                              style={[
                                styles.storeOptionText,
                                isSelected && styles.storeOptionTextSelected,
                              ]}
                            >
                              {store.name}
                            </Text>

                            {store.address ? (
                              <Text style={styles.storeAddress}>
                                {store.address}
                              </Text>
                            ) : null}
                          </View>

                          {isSelected ? (
                            <View style={styles.checkCircle}>
                              <Text style={styles.checkText}>✓</Text>
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>

                  {selectedStore ? (
                    <Text style={styles.helpText}>
                      Selected store: {selectedStore.name}
                    </Text>
                  ) : null}
                </View>
              </View>

              {errorMessage ? <ErrorMessage message={errorMessage} /> : null}

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
                    {isSubmitting ? "Creating…" : "Create staff"}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
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
    gap: 10,
  },
  appBarBackButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  appBarTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.secondaryDark,
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
    gap: 14,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  inputGroup: {
    gap: 7,
  },
  inputLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
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
  pinInput: {
    letterSpacing: 3,
  },
  helpText: {
    fontSize: fontSize.md,
    lineHeight: 19,
    color: colors.textMuted,
  },
  bodyText: {
    fontSize: fontSize.lg,
    lineHeight: 22,
    color: colors.textMuted,
  },
  storeList: {
    gap: 8,
  },
  storeOption: {
    minHeight: 54,
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
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
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
    fontWeight: fontWeight.extrabold,
    color: colors.surface,
  },
  actions: {
    gap: 12,
    paddingTop: 6,
  },
  btnPrimary: {
    height: 52,
    borderRadius: radius.pill,
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
    fontWeight: fontWeight.extrabold,
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
    color: colors.primary,
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
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
  },
  buttonPressed: {
    opacity: 0.72,
  },
});