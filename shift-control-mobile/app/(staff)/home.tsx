import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import {
  getCurrentShift,
  openShift,
  type CurrentShiftResult,
} from "@/src/api/shifts";
import { listCurrentShiftSales } from "@/src/api/sales";
import { useAuth } from "@/src/auth/AuthContext";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import { Screen } from "@/src/components/Screen";
import type { Sale, ShiftType } from "@/src/types/api";

import { formatDateTime } from "@/src/utils/dates";
import { formatMoney } from "@/src/utils/money";

type ShiftLoadState =
  | {
      status: "loading";
      result: null;
      errorMessage: null;
    }
  | {
      status: "ready";
      result: CurrentShiftResult;
      errorMessage: null;
    }
  | {
      status: "error";
      result: null;
      errorMessage: string;
    };

type SalesLoadState =
  | {
      status: "idle";
      sales: Sale[];
      errorMessage: null;
    }
  | {
      status: "loading";
      sales: Sale[];
      errorMessage: null;
    }
  | {
      status: "ready";
      sales: Sale[];
      errorMessage: null;
    }
  | {
      status: "error";
      sales: Sale[];
      errorMessage: string;
    };

export default function StaffHomeScreen() {
  const { user, logout } = useAuth();

  const [shiftState, setShiftState] = useState<ShiftLoadState>({
    status: "loading",
    result: null,
    errorMessage: null,
  });
  const [salesState, setSalesState] = useState<SalesLoadState>({
    status: "idle",
    sales: [],
    errorMessage: null,
  });
  const [openingShiftType, setOpeningShiftType] = useState<ShiftType | null>(
    null
  );
  const [openShiftErrorMessage, setOpenShiftErrorMessage] = useState<
    string | null
  >(null);

  const loadCurrentShift = useCallback(async () => {
    setShiftState({
      status: "loading",
      result: null,
      errorMessage: null,
    });
    setSalesState({
      status: "idle",
      sales: [],
      errorMessage: null,
    });

    try {
      const result = await getCurrentShift();

      setShiftState({
        status: "ready",
        result,
        errorMessage: null,
      });

      if (result.status === "active") {
        setSalesState({
          status: "loading",
          sales: [],
          errorMessage: null,
        });

        try {
          const sales = await listCurrentShiftSales();

          setSalesState({
            status: "ready",
            sales,
            errorMessage: null,
          });
        } catch (error) {
          setSalesState({
            status: "error",
            sales: [],
            errorMessage: getApiErrorMessage(error),
          });
        }
      }
    } catch (error) {
      setShiftState({
        status: "error",
        result: null,
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, []);

  const visibleSales = salesState.sales.slice(0, 5);
  const hiddenSalesCount = Math.max(salesState.sales.length - visibleSales.length, 0);

  useFocusEffect(
    useCallback(() => {
      void loadCurrentShift();
    }, [loadCurrentShift])
  );

  async function handleOpenShift(type: ShiftType) {
    if (openingShiftType) {
      return;
    }

    setOpeningShiftType(type);
    setOpenShiftErrorMessage(null);

    try {
      await openShift({ type });
      await loadCurrentShift();
    } catch (error) {
      setOpenShiftErrorMessage(getApiErrorMessage(error));
    } finally {
      setOpeningShiftType(null);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/");
  }

  if (shiftState.status === "loading") {
    return <LoadingState message="Checking current shift..." />;
  }

  const activeShift =
    shiftState.status === "ready" && shiftState.result.status === "active"
      ? shiftState.result.shift
      : null;

  const hasNoActiveShift =
    shiftState.status === "ready" && shiftState.result.status === "none";

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Staff home</Text>
          <Text style={styles.subtitle}>Welcome, {user?.fullName}</Text>
        </View>

        {shiftState.status === "error" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Could not load current shift</Text>
            <ErrorMessage message={shiftState.errorMessage} />
            <Button title="Try again" onPress={loadCurrentShift} />
          </View>
        ) : null}

        {hasNoActiveShift ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No active shift</Text>
            <Text style={styles.body}>
              You do not have an open shift right now.
            </Text>

            <ErrorMessage message={openShiftErrorMessage} />

            <View style={styles.actions}>
              <Button
                title="Open day shift"
                onPress={() => void handleOpenShift("DAY")}
                loading={openingShiftType === "DAY"}
                disabled={openingShiftType !== null}
              />
              <Button
                title="Open night shift"
                onPress={() => void handleOpenShift("NIGHT")}
                loading={openingShiftType === "NIGHT"}
                disabled={openingShiftType !== null}
              />
            </View>
          </View>
        ) : null}

        {activeShift ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Active shift</Text>
              <Text style={styles.body}>
                Type: {activeShift.type}
              </Text>
              <Text style={styles.body}>
                Status: {activeShift.status}
              </Text>
              <Text style={styles.body}>
                Opened at: {formatDateTime(activeShift.openedAt)}
              </Text>

              <Pressable onPress={loadCurrentShift}>
                <Text style={styles.refreshLink}>Refresh</Text>
              </Pressable>

              <Button
                title="Close shift"
                onPress={() =>
                  router.push({
                    pathname: "/(staff)/close-shift/preview",
                    params: {
                      shiftId: activeShift.id,
                    },
                  })
                }
              />
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.cardTitle}>Current shift sales</Text>
                <Pressable onPress={loadCurrentShift}>
                  <Text style={styles.refreshLink}>Refresh</Text>
                </Pressable>
              </View>

              <Button
                title="New sale"
                onPress={() => router.push("/(staff)/sales/new-sale")}
              />

              {salesState.status === "loading" ? (
                <Text style={styles.body}>Loading sales...</Text>
              ) : null}

              {salesState.status === "error" ? (
                <ErrorMessage message={salesState.errorMessage} />
              ) : null}

              {salesState.status === "ready" &&
              salesState.sales.length === 0 ? (
                <Text style={styles.body}>No sales registered yet.</Text>
              ) : null}

              {salesState.status === "ready" &&
              salesState.sales.length > 0 ? (
                <View style={styles.salesList}>
                  {visibleSales.map((sale) => (
                    <Pressable
                      key={sale.id}
                      style={styles.saleRow}
                      onPress={() =>
                        router.push(`/(staff)/sales/${sale.id}`)
                      }
                    >
                      <View style={styles.saleMain}>
                        <Text style={styles.saleTitle}>
                          Sale {sale.id.slice(0, 8)}
                        </Text>
                        <Text style={styles.saleMeta}>
                          {sale.status} · {sale.invoiceStatus}
                        </Text>
                      </View>

                      <Text style={styles.saleTotal}>
                        {formatMoney(sale.finalTotalAmount)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {hiddenSalesCount > 0 ? (
                <Button
                  title={`View all sales (${salesState.sales.length})`}
                  onPress={() => router.push("/(staff)/sales" as never)}
                />
              ) : null}
            </View>
          </>
        ) : null}

        <View style={styles.footer}>
          <Button title="Logout" onPress={handleLogout} />
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
    fontSize: 18,
    color: "#555555",
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
  actions: {
    gap: 12,
    marginTop: 4,
  },
  refreshLink: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  salesList: {
    gap: 12,
  },
  saleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  saleMain: {
    flex: 1,
    gap: 4,
  },
  saleTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  saleMeta: {
    fontSize: 14,
    color: "#666666",
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    marginTop: 8,
    paddingBottom: 24,
  },
});