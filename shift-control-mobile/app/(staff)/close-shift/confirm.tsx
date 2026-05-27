import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
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
import { closeShift } from "@/src/api/shifts";
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import type { ShiftCloseResult } from "@/src/types/api";
import { formatMoney } from "@/src/utils/money";

function parseNonNegativeNumber(value: string): number | null {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function parseOptionalParamNumber(value: string | undefined): number | null {
  if (value == null) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getTotalGlovoAmount(result: ShiftCloseResult): number {
  return result.totalGlovoOnline + result.totalGlovoCash;
}

function getBaseCashAmount(result: ShiftCloseResult): number {
  return result.expectedPhysicalCash - result.cashToWithdraw;
}

function diffDotColor(diff: number | null): string {
  if (diff === null || diff === 0) {
    return "#9ca8a5";
  }

  return diff < 0 ? "#ba1a1a" : "#825100";
}

function diffTextColor(diff: number | null): string {
  if (diff === null || diff === 0) {
    return "#131b2e";
  }

  return diff < 0 ? "#ba1a1a" : "#825100";
}

export default function CloseShiftConfirmScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    shiftId?: string;
    expectedCash?: string;
    expectedMb?: string;
    cashToWithdraw?: string;
  }>();

  const shiftId = params.shiftId;
  const expectedCashParam = parseOptionalParamNumber(params.expectedCash);
  const expectedMbParam = parseOptionalParamNumber(params.expectedMb);
  const cashToWithdrawParam = parseOptionalParamNumber(params.cashToWithdraw);

  const [confirmedCashAmount, setConfirmedCashAmount] = useState("");
  const [confirmedMbAmount, setConfirmedMbAmount] = useState("");
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ShiftCloseResult | null>(null);

  const confirmedCashNumber = useMemo(
    () => parseNonNegativeNumber(confirmedCashAmount),
    [confirmedCashAmount]
  );

  const confirmedMbNumber = useMemo(
    () => parseNonNegativeNumber(confirmedMbAmount),
    [confirmedMbAmount]
  );

  // Live UI differences only. Backend remains the source of truth after submit.
  const liveCashDiff = useMemo(
    () =>
      confirmedCashNumber !== null && expectedCashParam !== null
        ? confirmedCashNumber - expectedCashParam
        : null,
    [confirmedCashNumber, expectedCashParam]
  );

  const liveMbDiff = useMemo(
    () =>
      confirmedMbNumber !== null && expectedMbParam !== null
        ? confirmedMbNumber - expectedMbParam
        : null,
    [confirmedMbNumber, expectedMbParam]
  );

  const canSubmit =
    !!shiftId &&
    confirmedCashNumber !== null &&
    confirmedMbNumber !== null &&
    !isSubmitting &&
    result === null;

  async function handleSubmit() {
    if (
      !canSubmit ||
      !shiftId ||
      confirmedCashNumber === null ||
      confirmedMbNumber === null
    ) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const closeResult = await closeShift(shiftId, {
        confirmedCashAmount: confirmedCashNumber,
        confirmedMbAmount: confirmedMbNumber,
        note: note.trim().length > 0 ? note.trim() : undefined,
      });

      setResult(closeResult);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const displayName = user?.fullName ?? user?.username ?? "Staff";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  const appBar = (
    <View style={styles.appBar}>
      <View style={styles.appBarLeft}>
        <Text style={styles.menuIcon}>≡</Text>
        <Text style={styles.appBarTitle}>Shift Control</Text>
      </View>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    </View>
  );

  if (result !== null) {
    const isIncident = result.status === "CLOSED_WITH_INCIDENT";

    return (
      <SafeAreaView style={styles.safeArea}>
        {appBar}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={isIncident ? styles.warningBanner : styles.successBanner}>
            <Text
              style={
                isIncident ? styles.warningBannerTitle : styles.successBannerTitle
              }
            >
              {isIncident ? "Closed with incident" : "Shift closed successfully"}
            </Text>

            {result.cashDifference !== 0 || result.mbDifference !== 0 ? (
              <View style={styles.bannerDiffRow}>
                {result.cashDifference !== 0 ? (
                  <Text style={styles.bannerDiffText}>
                    Cash {result.cashDifference > 0 ? "over" : "short"} by{" "}
                    {formatMoney(Math.abs(result.cashDifference))}
                  </Text>
                ) : null}

                {result.mbDifference !== 0 ? (
                  <Text style={styles.bannerDiffText}>
                    MB {result.mbDifference > 0 ? "over" : "short"} by{" "}
                    {formatMoney(Math.abs(result.mbDifference))}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.bannerMatchText}>All amounts matched.</Text>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderText}>Closure summary</Text>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.prominentRow}>
                <Text style={styles.prominentLabel}>Total sales</Text>
                <Text style={styles.prominentValue}>
                  {formatMoney(result.totalSales)}
                </Text>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Cash</Text>
                <Text style={styles.dataValue}>
                  {formatMoney(result.totalCash)}
                </Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>MB</Text>
                <Text style={styles.dataValue}>{formatMoney(result.totalMb)}</Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Glovo online</Text>
                <Text style={styles.dataValue}>
                  {formatMoney(result.totalGlovoOnline)}
                </Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Glovo cash</Text>
                <Text style={styles.dataValue}>
                  {formatMoney(result.totalGlovoCash)}
                </Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.tealLabel}>Total Glovo</Text>
                <Text style={styles.tealValue}>
                  {formatMoney(getTotalGlovoAmount(result))}
                </Text>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Confirmed cash</Text>
                <Text style={styles.dataValue}>
                  {formatMoney(result.confirmedCashAmount)}
                </Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Confirmed MB</Text>
                <Text style={styles.dataValue}>
                  {formatMoney(result.confirmedMbAmount)}
                </Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Expected physical cash</Text>
                <Text style={styles.dataValue}>
                  {formatMoney(result.expectedPhysicalCash)}
                </Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Cash to withdraw</Text>
                <Text style={styles.dataValue}>
                  {formatMoney(result.cashToWithdraw)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Withdraw{" "}
              <Text style={styles.infoTextBold}>
                {formatMoney(result.cashToWithdraw)}
              </Text>{" "}
              from the register. Keep{" "}
              <Text style={styles.infoTextBold}>
                {formatMoney(getBaseCashAmount(result))}
              </Text>{" "}
              as base cash.
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.btnPrimary,
                pressed && styles.btnPressed,
              ]}
              onPress={() => router.replace("/(staff)/home")}
            >
              <Text style={styles.btnPrimaryText}>Back to home</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {appBar}

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
            <Text style={styles.pageTitle}>Close shift</Text>
            <Text style={styles.pageSubtitle}>
              Enter the physical amounts counted at the register.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardHeaderText, styles.cardHeaderTeal]}>
                Register amounts
              </Text>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirmed cash amount</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputPrefix}>€</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmedCashAmount}
                    onChangeText={setConfirmedCashAmount}
                    placeholder="0.00"
                    placeholderTextColor="#9ca8a5"
                    keyboardType="decimal-pad"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Confirmed MB/card terminal amount
                </Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputPrefix}>€</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmedMbAmount}
                    onChangeText={setConfirmedMbAmount}
                    placeholder="0.00"
                    placeholderTextColor="#9ca8a5"
                    keyboardType="decimal-pad"
                    autoCorrect={false}
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.differencesCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderText}>Differences</Text>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.diffRow}>
                <Text style={styles.dataLabel}>Cash difference</Text>
                <View style={styles.diffValueGroup}>
                  <View
                    style={[
                      styles.diffDot,
                      { backgroundColor: diffDotColor(liveCashDiff) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.diffValue,
                      { color: diffTextColor(liveCashDiff) },
                    ]}
                  >
                    {liveCashDiff !== null
                      ? formatMoney(Math.abs(liveCashDiff))
                      : "–"}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.diffRow}>
                <Text style={styles.dataLabel}>MB difference</Text>
                <View style={styles.diffValueGroup}>
                  <View
                    style={[
                      styles.diffDot,
                      { backgroundColor: diffDotColor(liveMbDiff) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.diffValue,
                      { color: diffTextColor(liveMbDiff) },
                    ]}
                  >
                    {liveMbDiff !== null
                      ? formatMoney(Math.abs(liveMbDiff))
                      : "–"}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.diffRow}>
                <Text style={styles.dataLabel}>Cash to withdraw</Text>
                <Text style={styles.cashToWithdrawValue}>
                  {cashToWithdrawParam !== null
                    ? formatMoney(cashToWithdrawParam)
                    : "–"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderText}>Optional note</Text>
            </View>

            <View style={styles.cardBody}>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="Add shift notes or issues..."
                placeholderTextColor="#9ca8a5"
                multiline
                autoCapitalize="sentences"
                autoCorrect={false}
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
                pressed && canSubmit && styles.btnPressed,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              <Text style={styles.btnPrimaryText}>
                {isSubmitting ? "Closing…" : "Close shift"}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnBackLink,
                pressed && styles.btnPressed,
              ]}
              onPress={() => router.back()}
              disabled={isSubmitting}
            >
              <Text style={styles.btnBackLinkText}>Back</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#faf8ff",
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
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
  },
  appBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  menuIcon: {
    fontSize: 20,
    color: "#00685f",
  },
  appBarTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#00685f",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#708cfd",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00217a",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    gap: 16,
  },
  pageHeader: {
    gap: 6,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#131b2e",
  },
  pageSubtitle: {
    fontSize: 16,
    color: "#3d4947",
    lineHeight: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  differencesCard: {
    backgroundColor: "#f2f3ff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  cardHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3d4947",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  cardHeaderTeal: {
    color: "#00685f",
  },
  cardBody: {
    padding: 16,
    gap: 14,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#e8ecef",
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#3d4947",
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    paddingHorizontal: 14,
    gap: 6,
  },
  inputPrefix: {
    fontSize: 16,
    color: "#6d7a77",
    fontWeight: "500",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#131b2e",
    paddingVertical: 0,
  },
  noteInput: {
    minHeight: 100,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    padding: 14,
    fontSize: 15,
    color: "#131b2e",
    lineHeight: 22,
  },
  diffRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  diffValueGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  diffDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  diffValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#131b2e",
  },
  cashToWithdrawValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#00685f",
  },
  prominentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  prominentLabel: {
    fontSize: 16,
    color: "#3d4947",
  },
  prominentValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#131b2e",
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  dataLabel: {
    fontSize: 14,
    color: "#3d4947",
    flexShrink: 1,
  },
  dataValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#131b2e",
    textAlign: "right",
  },
  tealLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00685f",
  },
  tealValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#00685f",
  },
  successBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#9bd49b",
    backgroundColor: "#edf9ed",
    padding: 16,
    gap: 8,
  },
  successBannerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f6b1f",
  },
  warningBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0d8a0",
    backgroundColor: "#fff8e6",
    padding: 16,
    gap: 8,
  },
  warningBannerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#825100",
  },
  bannerDiffRow: {
    gap: 4,
  },
  bannerDiffText: {
    fontSize: 14,
    color: "#825100",
    lineHeight: 20,
  },
  bannerMatchText: {
    fontSize: 14,
    color: "#1f6b1f",
    lineHeight: 20,
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bcc9c6",
    backgroundColor: "#f2f3ff",
    padding: 14,
  },
  infoText: {
    fontSize: 13,
    color: "#3d4947",
    lineHeight: 20,
  },
  infoTextBold: {
    fontWeight: "700",
    color: "#131b2e",
  },
  errorCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffdad6",
    backgroundColor: "#fff8f7",
    padding: 14,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  btnPrimary: {
    height: 52,
    backgroundColor: "#00685f",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    backgroundColor: "#9ecbc7",
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  btnBackLink: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  btnBackLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00685f",
  },
  btnPressed: {
    opacity: 0.8,
  },
});