import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { getStoreById, updateStore } from "@/src/api/stores";
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { colors, fontSize, fontWeight, radius, shadows } from "@/src/theme";

type EditStoreLoadState =
  | {
      status: "loading";
      errorMessage: null;
    }
  | {
      status: "ready";
      errorMessage: null;
    }
  | {
      status: "error";
      errorMessage: string;
    };


function parsePositiveNumber(value: string): number | null {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export default function EditStoreScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const storeId = params.id;

  const [loadState, setLoadState] = useState<EditStoreLoadState>({
    status: "loading",
    errorMessage: null,
  });

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [baseCashAmount, setBaseCashAmount] = useState("");
  const [wifiSsid, setWifiSsid] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(
    null
  );

  const baseCashAmountNumber = parsePositiveNumber(baseCashAmount);

  const canSubmit =
    loadState.status === "ready" &&
    name.trim().length > 0 &&
    address.trim().length > 0 &&
    wifiSsid.trim().length > 0 &&
    baseCashAmountNumber !== null &&
    !isSubmitting;

  useEffect(() => {
    async function loadStore() {
      if (!storeId) {
        setLoadState({
          status: "error",
          errorMessage: "Store id is missing.",
        });
        return;
      }

      try {
        const store = await getStoreById(storeId);

        setName(store.name);
        setAddress(store.address);
        setBaseCashAmount(String(store.baseCashAmount));
        setWifiSsid(store.wifiSsid ?? "");

        setLoadState({
          status: "ready",
          errorMessage: null,
        });
      } catch (error) {
        setLoadState({
          status: "error",
          errorMessage: getApiErrorMessage(error),
        });
      }
    }

    void loadStore();
  }, [storeId]);

  async function handleSubmit() {
    if (!storeId || !canSubmit || baseCashAmountNumber === null) {
      return;
    }

    setIsSubmitting(true);
    setSubmitErrorMessage(null);

    try {
      await updateStore(storeId, {
        name: name.trim(),
        address: address.trim(),
        baseCashAmount: baseCashAmountNumber,
        wifiSsid: wifiSsid.trim(),
      });

      router.replace(`/(admin)/stores/${storeId}`);
    } catch (error) {
      setSubmitErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loadState.status === "loading") {
    return <LoadingState message="Loading store..." />;
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
          <Text style={styles.pageTitle}>Edit store</Text>
          <Text style={styles.pageSubtitle}>
            Update the store information and Wi-Fi network.
          </Text>
        </View>

        {loadState.status === "error" ? (
          <ErrorMessage message={loadState.errorMessage} />
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <Text style={styles.sectionTitle}>Store information</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name</Text>

                  <TextInput
                    editable={!isSubmitting}
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Main Station"
                    placeholderTextColor="#6d7a77"
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Address</Text>

                  <TextInput
                    editable={!isSubmitting}
                    style={styles.input}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="e.g. 123 Business St"
                    placeholderTextColor="#6d7a77"
                    autoCapitalize="sentences"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Wi-Fi network name</Text>

                  <TextInput
                    editable={!isSubmitting}
                    style={styles.input}
                    value={wifiSsid}
                    onChangeText={setWifiSsid}
                    placeholder="e.g. MEO-4A6DA0"
                    placeholderTextColor="#6d7a77"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={32}
                  />
                </View>

                {wifiSsid.length > 0 && wifiSsid.trim().length === 0 ? (
                  <Text style={styles.errorHelpText}>
                    Wi-Fi network name cannot be empty.
                  </Text>
                ) : null}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Base cash amount</Text>

                  <TextInput
                    editable={!isSubmitting}
                    style={styles.input}
                    value={baseCashAmount}
                    onChangeText={(value) =>
                      setBaseCashAmount(value.replace(/[^\d.,]/g, ""))
                    }
                    placeholder="103.00"
                    placeholderTextColor="#6d7a77"
                    keyboardType="decimal-pad"
                    autoCorrect={false}
                  />
                </View>

                {baseCashAmount.length > 0 &&
                baseCashAmountNumber === null ? (
                  <Text style={styles.errorHelpText}>
                    Base cash amount must be greater than zero.
                  </Text>
                ) : null}
              </View>
            </View>

            {submitErrorMessage ? (
              <ErrorMessage message={submitErrorMessage} />
            ) : null}

            <View style={styles.actions}>
              <Pressable
                testID="save-store-button"
                style={({ pressed }) => [
                  styles.btnPrimary,
                  !canSubmit && styles.btnDisabled,
                  pressed && canSubmit && styles.buttonPressed,
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                <Text style={styles.btnPrimaryText}>
                  {isSubmitting ? "Saving…" : "Save changes"}
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
        )}
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
  errorHelpText: {
    fontSize: fontSize.md,
    lineHeight: 19,
    color: colors.danger,
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
  buttonPressed: {
    opacity: 0.72,
  },
});