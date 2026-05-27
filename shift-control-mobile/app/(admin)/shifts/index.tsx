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
import { listShifts, type ListShiftsParams } from "@/src/api/shifts";
import { listStores } from "@/src/api/stores";
import { listUsers } from "@/src/api/users";
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { LoadingState } from "@/src/components/LoadingState";
import type { AdminUser, Shift, ShiftStatus, Store } from "@/src/types/api";
import { formatDateTime } from "@/src/utils/dates";

type ShiftsState =
  | {
      status: "loading";
      shifts: Shift[];
      errorMessage: null;
    }
  | {
      status: "ready";
      shifts: Shift[];
      errorMessage: null;
    }
  | {
      status: "error";
      shifts: Shift[];
      errorMessage: string;
    };

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

type ShiftStatusFilter = "ALL" | ShiftStatus;

const STATUS_FILTERS: ShiftStatusFilter[] = ["ALL", "OPEN", "CLOSED"];

function isValidOptionalIsoDate(value: string): boolean {
  if (value.trim().length === 0) {
    return true;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime());
}

function StatusBadge({ status }: { status: ShiftStatus }) {
  const isOpen = status === "OPEN";

  return (
    <View
      style={[
        styles.statusBadge,
        isOpen ? styles.statusBadgeOpen : styles.statusBadgeClosed,
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          isOpen ? styles.statusBadgeTextOpen : styles.statusBadgeTextClosed,
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.filterChip,
        selected && styles.filterChipActive,
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          selected && styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function StatusSegment({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.statusSegment,
        selected && styles.statusSegmentActive,
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.statusSegmentText,
          selected && styles.statusSegmentTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ShiftRow({ shift, isLast }: { shift: Shift; isLast: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.shiftRow,
        isLast && styles.shiftRowLast,
        pressed && styles.rowPressed,
      ]}
      onPress={() => router.push(`/(admin)/shifts/${shift.id}`)}
    >
      <View style={styles.shiftMain}>
        <View style={styles.shiftTitleRow}>
          <StatusBadge status={shift.status} />
          <Text style={styles.shiftStaff}>{shift.staffName}</Text>
        </View>

        <Text style={styles.shiftStore}>{shift.storeName}</Text>

        <View style={styles.shiftDateBlock}>
          <Text style={styles.shiftDateText}>
            ↳ Opened {formatDateTime(shift.openedAt)}
          </Text>

          {shift.closedAt ? (
            <Text style={styles.shiftDateText}>
              ↲ Closed {formatDateTime(shift.closedAt)}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.viewGroup}>
        <Text style={styles.viewText}>View</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

export default function AdminShiftsScreen() {
  const { user } = useAuth();

  const [referenceDataState, setReferenceDataState] =
    useState<ReferenceDataState>({
      status: "loading",
      stores: [],
      staffUsers: [],
      errorMessage: null,
    });

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ShiftStatusFilter>("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [state, setState] = useState<ShiftsState>({
    status: "loading",
    shifts: [],
    errorMessage: null,
  });

  const canLoadShifts =
    isValidOptionalIsoDate(fromDate) && isValidOptionalIsoDate(toDate);

  const activeStores = useMemo(
    () =>
      referenceDataState.status === "ready"
        ? referenceDataState.stores.filter((store) => store.active)
        : [],
    [referenceDataState]
  );

  const activeStaffUsers = useMemo(
    () =>
      referenceDataState.status === "ready"
        ? referenceDataState.staffUsers.filter(
            (staffUser) => staffUser.active && staffUser.role === "STAFF"
          )
        : [],
    [referenceDataState]
  );

  const staffOptions = useMemo(() => {
    if (!selectedStoreId) {
      return activeStaffUsers;
    }

    return activeStaffUsers.filter(
      (staffUser) => staffUser.storeId === selectedStoreId
    );
  }, [activeStaffUsers, selectedStoreId]);

  const selectedStore = useMemo(
    () => activeStores.find((store) => store.id === selectedStoreId) ?? null,
    [activeStores, selectedStoreId]
  );

  const selectedStaff = useMemo(
    () => staffOptions.find((staffUser) => staffUser.id === selectedStaffId) ?? null,
    [staffOptions, selectedStaffId]
  );

  const loadReferenceData = useCallback(async () => {
    setReferenceDataState({
      status: "loading",
      stores: [],
      staffUsers: [],
      errorMessage: null,
    });

    try {
      const [stores, staffUsers] = await Promise.all([
        listStores(),
        listUsers({ role: "STAFF" }),
      ]);

      setReferenceDataState({
        status: "ready",
        stores,
        staffUsers,
        errorMessage: null,
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

  const loadShifts = useCallback(async () => {
    if (!canLoadShifts) {
      return;
    }

    setState({
      status: "loading",
      shifts: [],
      errorMessage: null,
    });

    const params: ListShiftsParams = {
      storeId: selectedStoreId ?? undefined,
      staffId: selectedStaffId ?? undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      from: fromDate.trim().length > 0 ? fromDate.trim() : undefined,
      to: toDate.trim().length > 0 ? toDate.trim() : undefined,
    };

    try {
      const shifts = await listShifts(params);

      setState({
        status: "ready",
        shifts,
        errorMessage: null,
      });
    } catch (error) {
      setState({
        status: "error",
        shifts: [],
        errorMessage: getApiErrorMessage(error),
      });
    }
  }, [
    canLoadShifts,
    selectedStoreId,
    selectedStaffId,
    statusFilter,
    fromDate,
    toDate,
  ]);

  useFocusEffect(
    useCallback(() => {
      void loadReferenceData();
      void loadShifts();
    }, [loadReferenceData, loadShifts])
  );

  function handleSelectStore(storeId: string | null) {
    setSelectedStoreId(storeId);
    setSelectedStaffId(null);
  }

  function handleClearFilters() {
    setSelectedStoreId(null);
    setSelectedStaffId(null);
    setStatusFilter("ALL");
    setFromDate("");
    setToDate("");
  }

  const openCount =
    state.status === "ready"
      ? state.shifts.filter((shift) => shift.status === "OPEN").length
      : 0;

  const closedCount =
    state.status === "ready"
      ? state.shifts.filter((shift) => shift.status === "CLOSED").length
      : 0;

  const displayName = user?.fullName ?? user?.username ?? "Admin";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (referenceDataState.status === "loading" || state.status === "loading") {
    return <LoadingState message="Loading shifts..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <Text style={styles.menuIcon}>≡</Text>
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
            <Text style={styles.pageTitle}>Shifts</Text>
            <Text style={styles.pageSubtitle}>
              Filter and review all shift records.
            </Text>
          </View>

          {referenceDataState.status === "error" ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Could not load filters</Text>
              </View>

              <View style={styles.cardBody}>
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

          <View style={styles.filterCard}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Store Name</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalChips}
              >
                <FilterChip
                  label="All"
                  selected={selectedStoreId === null}
                  onPress={() => handleSelectStore(null)}
                />

                {activeStores.map((store) => (
                  <FilterChip
                    key={store.id}
                    label={store.name}
                    selected={store.id === selectedStoreId}
                    onPress={() => handleSelectStore(store.id)}
                  />
                ))}
              </ScrollView>

              {selectedStore ? (
                <Text style={styles.helperText}>
                  Selected store: {selectedStore.name}
                </Text>
              ) : null}
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Staff Member</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalChips}
              >
                <FilterChip
                  label="All staff"
                  selected={selectedStaffId === null}
                  onPress={() => setSelectedStaffId(null)}
                />

                {staffOptions.map((staffUser) => (
                  <FilterChip
                    key={staffUser.id}
                    label={staffUser.fullName}
                    selected={staffUser.id === selectedStaffId}
                    onPress={() => setSelectedStaffId(staffUser.id)}
                  />
                ))}
              </ScrollView>

              {selectedStaff ? (
                <Text style={styles.helperText}>
                  Selected staff: {selectedStaff.fullName}
                </Text>
              ) : null}
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status</Text>

              <View style={styles.statusSegments}>
                {STATUS_FILTERS.map((filter) => (
                  <StatusSegment
                    key={filter}
                    label={filter}
                    selected={filter === statusFilter}
                    onPress={() => setStatusFilter(filter)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.dateRow}>
              <View style={styles.dateInputGroup}>
                <Text style={styles.filterLabel}>From</Text>
                <TextInput
                  style={[
                    styles.dateInput,
                    fromDate.length > 0 &&
                      !isValidOptionalIsoDate(fromDate) &&
                      styles.dateInputError,
                  ]}
                  value={fromDate}
                  onChangeText={setFromDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#6d7a77"
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.dateInputGroup}>
                <Text style={styles.filterLabel}>To</Text>
                <TextInput
                  style={[
                    styles.dateInput,
                    toDate.length > 0 &&
                      !isValidOptionalIsoDate(toDate) &&
                      styles.dateInputError,
                  ]}
                  value={toDate}
                  onChangeText={setToDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#6d7a77"
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {fromDate.length > 0 && !isValidOptionalIsoDate(fromDate) ? (
              <Text style={styles.validationText}>
                From date must use YYYY-MM-DD format.
              </Text>
            ) : null}

            {toDate.length > 0 && !isValidOptionalIsoDate(toDate) ? (
              <Text style={styles.validationText}>
                To date must use YYYY-MM-DD format.
              </Text>
            ) : null}

            <View style={styles.filterActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.btnPrimary,
                  !canLoadShifts && styles.btnDisabled,
                  pressed && canLoadShifts && styles.buttonPressed,
                ]}
                onPress={loadShifts}
                disabled={!canLoadShifts}
              >
                <Text style={styles.btnPrimaryText}>Load shifts</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.btnClear,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleClearFilters}
              >
                <Text style={styles.btnClearText}>Clear filters</Text>
              </Pressable>
            </View>

            {state.status === "ready" ? (
              <Text style={styles.resultSummary}>
                Open: {openCount} · Closed: {closedCount}
              </Text>
            ) : null}
          </View>

          {state.status === "error" ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Could not load shifts</Text>
              </View>

              <View style={styles.cardBody}>
                <ErrorMessage message={state.errorMessage} />

                <Pressable
                  style={({ pressed }) => [
                    styles.btnOutline,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={loadShifts}
                >
                  <Text style={styles.btnOutlineText}>Try again</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {state.status === "ready" && state.shifts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>□</Text>
              <Text style={styles.emptyTitle}>No shifts found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your filters to find specific shift records.
              </Text>
            </View>
          ) : null}

          {state.status === "ready" && state.shifts.length > 0 ? (
            <View style={styles.resultsCard}>
              {state.shifts.map((shift, index) => (
                <ShiftRow
                  key={shift.id}
                  shift={shift}
                  isLast={index === state.shifts.length - 1}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.btnRefresh,
                pressed && styles.buttonPressed,
              ]}
              onPress={loadShifts}
            >
              <Text style={styles.btnRefreshText}>⟳ Refresh</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnBack,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.back()}
            >
              <Text style={styles.btnBackText}>← Back</Text>
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
    fontWeight: "800",
    color: "#00685f",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#dde1ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bcc9c6",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#00217a",
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
    fontSize: 28,
    fontWeight: "800",
    color: "#131b2e",
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 15,
    color: "#3d4947",
    lineHeight: 22,
  },
  filterCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    padding: 16,
    gap: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#3d4947",
  },
  horizontalChips: {
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#f2f3ff",
    borderWidth: 1,
    borderColor: "#eaedff",
  },
  filterChipActive: {
    backgroundColor: "#00685f",
    borderColor: "#00685f",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#3d4947",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  helperText: {
    fontSize: 12,
    color: "#6d7a77",
    lineHeight: 18,
  },
  statusSegments: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bcc9c6",
    backgroundColor: "#f8fafc",
    padding: 4,
  },
  statusSegment: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  statusSegmentActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  statusSegmentText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#3d4947",
  },
  statusSegmentTextActive: {
    color: "#00685f",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateInputGroup: {
    flex: 1,
    gap: 8,
  },
  dateInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bcc9c6",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#131b2e",
  },
  dateInputError: {
    borderColor: "#ba1a1a",
  },
  validationText: {
    fontSize: 12,
    color: "#ba1a1a",
    lineHeight: 18,
  },
  filterActions: {
    gap: 10,
  },
  resultSummary: {
    fontSize: 13,
    color: "#3d4947",
  },
  btnPrimary: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#00685f",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00685f",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#ffffff",
  },
  btnDisabled: {
    backgroundColor: "#9ecbc7",
    shadowOpacity: 0,
    elevation: 0,
  },
  btnClear: {
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  btnClearText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#00685f",
  },
  resultsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  shiftRow: {
    minHeight: 104,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  shiftRowLast: {
    borderBottomWidth: 0,
  },
  rowPressed: {
    backgroundColor: "#f2f3ff",
  },
  shiftMain: {
    flex: 1,
    gap: 5,
  },
  shiftTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  shiftStaff: {
    fontSize: 16,
    fontWeight: "900",
    color: "#131b2e",
  },
  shiftStore: {
    fontSize: 14,
    color: "#3d4947",
  },
  shiftDateBlock: {
    gap: 3,
    marginTop: 3,
  },
  shiftDateText: {
    fontSize: 12,
    color: "#6d7a77",
    lineHeight: 17,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeOpen: {
    backgroundColor: "#d2f5f0",
  },
  statusBadgeClosed: {
    backgroundColor: "#dde1ff",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  statusBadgeTextOpen: {
    color: "#005049",
  },
  statusBadgeTextClosed: {
    color: "#173bab",
  },
  viewGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#00685f",
  },
  chevron: {
    fontSize: 22,
    color: "#00685f",
    marginTop: -1,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#131b2e",
  },
  cardBody: {
    padding: 16,
    gap: 12,
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e0dd",
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  emptyIcon: {
    fontSize: 34,
    color: "#00685f",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#131b2e",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#3d4947",
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 4,
  },
  btnRefresh: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#89f5e7",
    alignItems: "center",
    justifyContent: "center",
  },
  btnRefreshText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#005049",
  },
  btnBack: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#bcc9c6",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  btnBackText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#3d4947",
  },
  btnOutline: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#00685f",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#00685f",
  },
  buttonPressed: {
    opacity: 0.72,
  },
});