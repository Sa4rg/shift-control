import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { closeShift } from "@/src/api/shifts";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { Screen } from "@/src/components/Screen";
import { TextField } from "@/src/components/TextField";
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

function DifferenceText({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  let message = `${label} matched`;

  if (value > 0) {
    message = `${label} over by ${formatMoney(value)}`;
  }

  if (value < 0) {
    message = `${label} short by ${formatMoney(Math.abs(value))}`;
  }

  return <Text style={styles.body}>{message}</Text>;
}

function getTotalGlovoAmount(result: ShiftCloseResult): number {
  return result.totalGlovoOnline + result.totalGlovoCash;
}

function getBaseCashAmount(result: ShiftCloseResult): number {
  return result.expectedPhysicalCash - result.cashToWithdraw;
}

export default function CloseShiftConfirmScreen() {
  const params = useLocalSearchParams<{ shiftId?: string }>();
  const shiftId = params.shiftId;

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

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Confirm close shift</Text>
            <Text style={styles.subtitle}>
              Enter the total physical cash counted in the register and the MB
              terminal total.
            </Text>
          </View>

          {result ? (
            <>
              <View
                style={
                  result.status === "CLOSED_WITH_INCIDENT"
                    ? styles.warningCard
                    : styles.successCard
                }
              >
                <Text
                  style={
                    result.status === "CLOSED_WITH_INCIDENT"
                      ? styles.warningTitle
                      : styles.successTitle
                  }
                >
                  {result.status === "CLOSED_WITH_INCIDENT"
                    ? "Closed with incident"
                    : "Closed successfully"}
                </Text>

                <DifferenceText label="Cash" value={result.cashDifference} />
                <DifferenceText label="MB" value={result.mbDifference} />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Closure summary</Text>

                <Text style={styles.body}>
                  Total sales: {formatMoney(result.totalSales)}
                </Text>
                <Text style={styles.body}>
                  Cash sales: {formatMoney(result.totalCash)}
                </Text>
                <Text style={styles.body}>
                  MB sales: {formatMoney(result.totalMb)}
                </Text>
                <Text style={styles.body}>
                  Glovo online: {formatMoney(result.totalGlovoOnline)}
                </Text>
                <Text style={styles.body}>
                  Glovo cash: {formatMoney(result.totalGlovoCash)}
                </Text>
                <Text style={styles.body}>
                  Total Glovo: {formatMoney(getTotalGlovoAmount(result))}
                </Text>
                <Text style={styles.body}>
                  Cash to withdraw: {formatMoney(result.cashToWithdraw)}
                </Text>
                <Text style={styles.body}>
                  Base cash to keep: {formatMoney(getBaseCashAmount(result))}
                </Text>
                <Text style={styles.body}>
                  Expected physical cash:{" "}
                  {formatMoney(result.expectedPhysicalCash)}
                </Text>
                <Text style={styles.body}>
                  Confirmed cash: {formatMoney(result.confirmedCashAmount)}
                </Text>
                <Text style={styles.body}>
                  Confirmed MB: {formatMoney(result.confirmedMbAmount)}
                </Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Cash handling</Text>
                <Text style={styles.infoText}>
                  Withdraw {formatMoney(result.cashToWithdraw)} from the
                  register.
                </Text>
                <Text style={styles.infoText}>
                  Keep {formatMoney(getBaseCashAmount(result))} as the base
                  cash amount in the register.
                </Text>
                <Text style={styles.infoText}>
                  Glovo online is included in sales and Glovo totals, but it does not affect physical cash or MB terminal totals.
                </Text>
              </View>

              <View style={styles.actions}>
                <Button
                  title="Back to home"
                  onPress={() => router.replace("/(staff)/home")}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>What should I enter?</Text>
                <Text style={styles.infoText}>
                  Confirmed cash is the total physical cash currently in the
                  register, not only the cash from sales.
                </Text>
                <Text style={styles.infoText}>
                  It should include the base cash kept in the register plus
                  today's cash and Glovo cash payments.
                </Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Confirmed totals</Text>

                <TextField
                  label="Confirmed cash amount"
                  value={confirmedCashAmount}
                  onChangeText={setConfirmedCashAmount}
                  placeholder="273.00"
                  keyboardType="decimal-pad"
                />

                <TextField
                  label="Confirmed MB amount"
                  value={confirmedMbAmount}
                  onChangeText={setConfirmedMbAmount}
                  placeholder="80.00"
                  keyboardType="decimal-pad"
                />

                <TextField
                  label="Note"
                  value={note}
                  onChangeText={setNote}
                  placeholder="Optional"
                  autoCapitalize="sentences"
                />

                <ErrorMessage message={errorMessage} />

                <Button
                  title="Close shift"
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  disabled={!canSubmit}
                />
              </View>

              <View style={styles.actions}>
                <Button
                  title="Back to preview"
                  onPress={() => router.back()}
                  disabled={isSubmitting}
                />
              </View>
            </>
          )}
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
  infoCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#cfe0ff",
    borderRadius: 16,
    padding: 20,
    backgroundColor: "#f1f6ff",
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f4f8f",
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1f4f8f",
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
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
});