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
import { colors, commonStyles, fontSize } from "@/src/theme";

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
    <SafeAreaView style={commonStyles.safeArea}>
      <AppTopBar variant="back" />

      <ScrollView
        contentContainerStyle={commonStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={commonStyles.pageHeader}>
          <Text style={commonStyles.pageTitle}>Edit store</Text>
          <Text style={commonStyles.pageSubtitle}>
            Update the store information and Wi-Fi network.
          </Text>
        </View>

        {loadState.status === "error" ? (
          <ErrorMessage message={loadState.errorMessage} />
        ) : (
          <>
            <View style={commonStyles.card}>
              <View style={commonStyles.cardBody}>
                <Text style={commonStyles.sectionLabel}>Store information</Text>

                <View style={commonStyles.inputGroup}>
                  <Text style={commonStyles.inputLabel}>Name</Text>

                  <TextInput
                    editable={!isSubmitting}
                    style={commonStyles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Main Station"
                    placeholderTextColor="#6d7a77"
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>

                <View style={commonStyles.inputGroup}>
                  <Text style={commonStyles.inputLabel}>Address</Text>

                  <TextInput
                    editable={!isSubmitting}
                    style={commonStyles.input}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="e.g. 123 Business St"
                    placeholderTextColor="#6d7a77"
                    autoCapitalize="sentences"
                    autoCorrect={false}
                  />
                </View>

                <View style={commonStyles.inputGroup}>
                  <Text style={commonStyles.inputLabel}>Wi-Fi network name</Text>

                  <TextInput
                    editable={!isSubmitting}
                    style={commonStyles.input}
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

                <View style={commonStyles.inputGroup}>
                  <Text style={commonStyles.inputLabel}>Base cash amount</Text>

                  <TextInput
                    editable={!isSubmitting}
                    style={commonStyles.input}
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

            <View style={commonStyles.actions}>
              <Pressable
                testID="save-store-button"
                style={({ pressed }) => [
                  commonStyles.primaryButton,
                  !canSubmit && commonStyles.buttonDisabled,
                  pressed && canSubmit && commonStyles.buttonPressed,
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                <Text style={commonStyles.primaryButtonText}>
                  {isSubmitting ? "Saving…" : "Save changes"}
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
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  errorHelpText: {
    fontSize: fontSize.md,
    lineHeight: 19,
    color: colors.danger,
  },
});