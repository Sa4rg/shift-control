import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { getShiftClosePreview } from "@/src/api/shifts";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import type { ShiftClosePreview } from "@/src/types/api";
import { formatMoney } from "@/src/utils/money";

type ClosePreviewState =
  | {
      status: "loading";
      preview: null;
      errorMessage: null;
    }
  | {
      status: "ready";
      preview: ShiftClosePreview;
      errorMessage: null;
    }
  | {
      status: "error";
      preview: null;
      errorMessage: string;
    };

function getTotalGlovoAmount(preview: ShiftClosePreview): number {
  return preview.totalGlovoOnline + preview.totalGlovoCash;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

export default function CloseShiftPreviewScreen() {
  const params = useLocalSearchParams<{ shiftId?: string }>();
  const shiftId = params.shiftId;

  const [state, setState] = useState<ClosePreviewState>({
    status: "loading",
    preview: null,
    errorMessage: null,
  });

  const loadPreview = useCallback(async () => {
    if (!shiftId) {
      setState({
        status: "error",
        preview: null,
        errorMessage: "Shift id is missing.",
      });
      return;
    }

    setState({
      status: "loading",
      preview: null,
      errorMessage: null,
    });

    try {
      const preview = await getShiftClosePreview(shiftId);

      setState({
        status: "ready",
        preview,
        errorMessage: null,
      });
    } catch (error) {
      setState({
        status: "error",
        preview: null,
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, [shiftId]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  if (state.status === "loading") {
    return <LoadingState message="Loading close preview..." />;
  }

  if (state.status === "error") {
    return (
      <Screen>
        <View style={styles.container}>
          <Text style={styles.title}>Close shift preview</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Could not load preview</Text>
            <ErrorMessage message={state.errorMessage} />
            <Button title="Try again" onPress={loadPreview} />
            <Button title="Back" onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  const preview = state.preview;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Close shift preview</Text>
          <Text style={styles.subtitle}>
            Review backend-calculated totals before closing the shift.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shift</Text>
          <SummaryRow label="Staff" value={preview.staffName} />
          <SummaryRow label="Store" value={preview.storeName} />
          <SummaryRow label="Shift" value={preview.shiftId.slice(0, 8)} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sales totals</Text>
          <SummaryRow label="Total sales" value={formatMoney(preview.totalSales)} />
          <SummaryRow
            label="Pending invoice total"
            value={formatMoney(preview.pendingInvoiceTotal)}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment totals</Text>
          <SummaryRow label="Cash" value={formatMoney(preview.totalCash)} />
          <SummaryRow label="MB" value={formatMoney(preview.totalMb)} />
          <SummaryRow
            label="Glovo online"
            value={formatMoney(preview.totalGlovoOnline)}
          />
          <SummaryRow
            label="Glovo cash"
            value={formatMoney(preview.totalGlovoCash)}
          />
          <SummaryRow
            label="Total Glovo"
            value={formatMoney(getTotalGlovoAmount(preview))}
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Glovo handling</Text>
          <Text style={styles.infoText}>
            Glovo online is included in sales and Glovo totals, but it does not affect physical cash or MB terminal totals.
          </Text>
          <Text style={styles.infoText}>
            Glovo cash is included in Glovo totals and affects physical cash.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cash register</Text>
          <SummaryRow
            label="Cash to withdraw"
            value={formatMoney(preview.cashToWithdraw)}
          />
          <SummaryRow
            label="Expected physical cash"
            value={formatMoney(preview.expectedPhysicalCash)}
          />
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Confirm carefully</Text>
          <Text style={styles.warningText}>
            Closing the shift is final. Confirm the physical totals before continuing.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="Confirm close shift"
            onPress={() =>
              router.push({
                pathname: "/(staff)/close-shift/confirm",
                params: {
                  shiftId: preview.shiftId,
                },
              })
            }
          />
          <Button title="Refresh preview" onPress={loadPreview} />
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
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 16,
    color: "#555555",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
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
  warningCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#f0d28a",
    borderRadius: 16,
    padding: 20,
    backgroundColor: "#fff8e5",
  },
  warningTitle: {
    fontSize: 18,
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