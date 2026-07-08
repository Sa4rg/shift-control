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
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { colors, commonStyles, fontWeight, fontSize, radius } from "@/src/theme";
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

  if (storesState.status === "loading") {
    return <LoadingState message="Loading stores..." />;
  }

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <AppTopBar variant="back" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={commonStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={commonStyles.pageHeader}>
            <Text style={commonStyles.pageTitle}>Create staff</Text>
            <Text style={commonStyles.pageSubtitle}>
              Enter details to create a new staff account.
            </Text>
          </View>

          {storesState.status === "error" ? (
            <View style={commonStyles.card}>
              <View style={commonStyles.cardHeader}>
                <Text style={commonStyles.cardTitle}>Could not load stores</Text>
              </View>

              <View style={commonStyles.cardBody}>
                <ErrorMessage message={storesState.errorMessage} />

                <Pressable
                  style={({ pressed }) => [
                    commonStyles.outlineButton,
                    pressed && commonStyles.buttonPressed,
                  ]}
                  onPress={loadStores}
                >
                  <Text style={commonStyles.outlineButtonText}>Try again</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {storesState.status === "ready" && storesState.stores.length === 0 ? (
            <View style={commonStyles.card}>
              <View style={commonStyles.cardHeader}>
                <Text style={commonStyles.cardTitle}>No active stores</Text>
              </View>

              <View style={commonStyles.cardBody}>
                <Text style={styles.bodyText}>
                  Create or activate a store before creating staff users.
                </Text>
              </View>
            </View>
          ) : null}

          {storesState.status === "ready" && storesState.stores.length > 0 ? (
            <>
              <View style={commonStyles.card}>
                <View style={commonStyles.cardBody}>
                  <Text style={commonStyles.sectionLabel}>Account details</Text>

                  <View style={commonStyles.inputGroup}>
                    <Text style={commonStyles.inputLabel}>Full name</Text>
                    <TextInput
                      style={commonStyles.input}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="e.g. Maria Silva"
                      placeholderTextColor="#6d7a77"
                      autoCapitalize="words"
                      autoCorrect={false}
                      editable={!isSubmitting}
                    />
                  </View>

                  <View style={commonStyles.inputGroup}>
                    <Text style={commonStyles.inputLabel}>Username</Text>
                    <TextInput
                      style={commonStyles.input}
                      value={username}
                      onChangeText={setUsername}
                      placeholder="e.g. msilva"
                      placeholderTextColor="#6d7a77"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isSubmitting}
                    />
                  </View>

                  <View style={commonStyles.inputGroup}>
                    <Text style={commonStyles.inputLabel}>PIN</Text>
                    <TextInput
                      style={[commonStyles.input, styles.pinInput]}
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
                    <Text style={commonStyles.helpText}>
                      PIN must be exactly 6 digits.
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={commonStyles.card}>
                <View style={commonStyles.cardBody}>
                  <Text style={commonStyles.sectionLabel}>Store assignment</Text>

                  <View style={styles.storeList}>
                    {storesState.stores.map((store) => {
                      const isSelected = store.id === selectedStoreId;

                      return (
                        <Pressable
                          key={store.id}
                          style={({ pressed }) => [
                            styles.storeOption,
                            isSelected && styles.storeOptionSelected,
                            pressed && commonStyles.buttonPressed,
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
                    <Text style={commonStyles.helpText}>
                      Selected store: {selectedStore.name}
                    </Text>
                  ) : null}
                </View>
              </View>

              {errorMessage ? <ErrorMessage message={errorMessage} /> : null}

              <View style={commonStyles.actions}>
                <Pressable
                  style={({ pressed }) => [
                    commonStyles.primaryButton,
                    !canSubmit && commonStyles.buttonDisabled,
                    pressed && canSubmit && commonStyles.buttonPressed,
                  ]}
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                >
                  <Text style={commonStyles.primaryButtonText}>
                    {isSubmitting ? "Creating…" : "Create staff"}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    commonStyles.textButton,
                    pressed && commonStyles.buttonPressed,
                  ]}
                  onPress={() => router.back()}
                  disabled={isSubmitting}
                >
                  <Text style={commonStyles.textButtonText}>Cancel</Text>
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
  keyboardView: {
    flex: 1,
  },
  pinInput: {
    letterSpacing: 3,
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
});