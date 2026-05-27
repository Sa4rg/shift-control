import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { getShiftClosePreview } from "@/src/api/shifts";
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type { ShiftClosePreview } from "@/src/types/api";
import { formatMoney } from "@/src/utils/money";

function getTotalGlovoAmount(preview: ShiftClosePreview): number {
  return preview.totalGlovoOnline + preview.totalGlovoCash;
}

function getBaseCashAmount(preview: ShiftClosePreview): number {
  return preview.expectedPhysicalCash - preview.cashToWithdraw;
}

type ClosePreviewState =
  | { status: "loading"; preview: null; errorMessage: null }
  | { status: "ready"; preview: ShiftClosePreview; errorMessage: null }
  | { status: "error"; preview: null; errorMessage: string };

export default function CloseShiftPreviewScreen() {
  const { user } = useAuth();
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

    setState({ status: "loading", preview: null, errorMessage: null });

    try {
      const preview = await getShiftClosePreview(shiftId);
      setState({ status: "ready", preview, errorMessage: null });
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

  const displayName = user?.fullName ?? user?.username ?? "Staff";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (state.status === "loading") {
    return <LoadingState message="Loading close preview..." />;
  }

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

  if (state.status === "error") {
    return (
      <SafeAreaView style={styles.safeArea}>
        {appBar}

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Close shift preview</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Could not load preview</Text>
            <ErrorMessage message={state.errorMessage} />

            <Pressable
              style={({ pressed }) => [
                styles.btnPrimary,
                pressed && styles.btnPressed,
              ]}
              onPress={loadPreview}
            >
              <Text style={styles.btnPrimaryText}>Try again</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnBack,
                pressed && styles.btnPressed,
              ]}
              onPress={() => router.back()}
            >
              <Text style={styles.btnBackText}>Back</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const preview = state.preview;

  return (
    <SafeAreaView style={styles.safeArea}>
      {appBar}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Close shift preview</Text>
          <Text style={styles.pageSubtitle}>Review totals before closing.</Text>

          <View style={styles.shiftMeta}>
            <Text style={styles.shiftMetaText}>{preview.staffName}</Text>
            <Text style={styles.shiftMetaDot}>·</Text>
            <Text style={styles.shiftMetaText}>{preview.storeName}</Text>
            <Text style={styles.shiftMetaDot}>·</Text>
            <Text style={styles.shiftMetaText}>
              #{preview.shiftId.slice(0, 8).toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>Sales totals</Text>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.prominentRow}>
              <Text style={styles.prominentLabel}>Total sales</Text>
              <Text style={styles.prominentValue}>
                {formatMoney(preview.totalSales)}
              </Text>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Cash</Text>
              <Text style={styles.dataValue}>
                {formatMoney(preview.totalCash)}
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>MB</Text>
              <Text style={styles.dataValue}>{formatMoney(preview.totalMb)}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Glovo online</Text>
              <Text style={styles.dataValue}>
                {formatMoney(preview.totalGlovoOnline)}
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Glovo cash</Text>
              <Text style={styles.dataValue}>
                {formatMoney(preview.totalGlovoCash)}
              </Text>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.dataRow}>
              <Text style={styles.tealLabel}>Total Glovo</Text>
              <Text style={styles.tealValue}>
                {formatMoney(getTotalGlovoAmount(preview))}
              </Text>
            </View>

            {preview.pendingInvoiceTotal > 0 ? (
              <View style={styles.dataRow}>
                <Text style={styles.amberLabel}>Pending invoice</Text>
                <Text style={styles.amberValue}>
                  {formatMoney(preview.pendingInvoiceTotal)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>Cash calculation</Text>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Cash payments</Text>
              <Text style={styles.dataValue}>
                {formatMoney(preview.totalCash)}
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Cash to withdraw</Text>
              <Text style={styles.dataValue}>
                {formatMoney(preview.cashToWithdraw)}
              </Text>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.remainingRow}>
              <Text style={styles.remainingLabel}>Remaining base cash</Text>
              <View style={styles.remainingPill}>
                <Text style={styles.remainingPillText}>
                  {formatMoney(getBaseCashAmount(preview))}
                </Text>
              </View>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Expected physical cash</Text>
              <Text style={styles.dataValue}>
                {formatMoney(preview.expectedPhysicalCash)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            <Text style={styles.infoTextBold}>Glovo online</Text>
            {
              " is tracked in Glovo totals but does not affect physical cash or MB terminal. "
            }
            <Text style={styles.infoTextBold}>Glovo cash</Text>
            {" affects physical cash."}
          </Text>
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            Closing this shift will finalize all recorded transactions and
            incidents. This action cannot be undone.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.btnPrimary,
              pressed && styles.btnPressed,
            ]}
            onPress={() =>
              router.push({
                pathname: "/(staff)/close-shift/confirm",
                params: {
                  shiftId: preview.shiftId,
                  expectedCash: String(preview.expectedPhysicalCash),
                  expectedMb: String(preview.totalMb),
                  cashToWithdraw: String(preview.cashToWithdraw),
                },
              })
            }
          >
            <Text style={styles.btnPrimaryText}>Proceed to close shift</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.btnOutline,
              pressed && styles.btnPressed,
            ]}
            onPress={loadPreview}
          >
            <Text style={styles.btnOutlineText}>Refresh preview</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.btnBack,
              pressed && styles.btnPressed,
            ]}
            onPress={() => router.back()}
          >
            <Text style={styles.btnBackText}>Back</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#faf8ff",
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
  shiftMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    marginTop: 2,
  },
  shiftMetaText: {
    fontSize: 13,
    color: "#6d7a77",
  },
  shiftMetaDot: {
    fontSize: 13,
    color: "#bcc9c6",
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
  cardBody: {
    padding: 16,
    gap: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#131b2e",
    padding: 16,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
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
  amberLabel: {
    fontSize: 14,
    color: "#825100",
  },
  amberValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#825100",
  },
  remainingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  remainingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#131b2e",
  },
  remainingPill: {
    backgroundColor: "#d2f5f0",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#a5e9e0",
  },
  remainingPillText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#004f49",
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
  warningCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0d8a0",
    backgroundColor: "#fff8e6",
    padding: 14,
  },
  warningText: {
    fontSize: 13,
    color: "#825100",
    lineHeight: 20,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  btnPrimary: {
    height: 48,
    backgroundColor: "#00685f",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  btnOutline: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#00685f",
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00685f",
  },
  btnBack: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#bcc9c6",
    alignItems: "center",
    justifyContent: "center",
  },
  btnBackText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00685f",
  },
  btnPressed: {
    opacity: 0.8,
  },
});