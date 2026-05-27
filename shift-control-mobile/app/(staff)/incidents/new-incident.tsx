import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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
import { createIncident } from "@/src/api/incidents";
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import type { IncidentSeverity, IncidentType } from "@/src/types/api";

const INCIDENT_TYPES: IncidentType[] = [
  "CASH_DIFFERENCE",
  "MB_DIFFERENCE",
  "GLOVO_ISSUE",
  "WRONG_CHARGE",
  "PENDING_INVOICE",
  "OPERATIONAL_NOTE",
];

const INCIDENT_SEVERITIES: IncidentSeverity[] = ["LOW", "MEDIUM", "HIGH"];

function formatShortId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function formatIncidentTypeLabel(value: IncidentType): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.toUpperCase())
    .join("_");
}

function getContextLabel({
  shiftId,
  closureId,
  saleId,
}: {
  shiftId?: string;
  closureId?: string;
  saleId?: string;
}): string | null {
  if (shiftId) {
    return `Linked to Shift ${formatShortId(shiftId)}`;
  }

  if (closureId) {
    return `Linked to Closure ${formatShortId(closureId)}`;
  }

  if (saleId) {
    return `Linked to Sale ${formatShortId(saleId)}`;
  }

  return null;
}

function TypeOption({
  option,
  selected,
  disabled,
  onPress,
}: {
  option: IncidentType;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.typeOption,
        selected && styles.typeOptionSelected,
        pressed && !disabled && styles.buttonPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.typeOptionText,
          selected && styles.typeOptionTextSelected,
        ]}
      >
        {formatIncidentTypeLabel(option)}
      </Text>

      {selected ? (
        <Text style={styles.typeCheck}>✓</Text>
      ) : null}
    </Pressable>
  );
}

function SeverityOption({
  option,
  selected,
  disabled,
  onPress,
}: {
  option: IncidentSeverity;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.severityOption,
        selected && styles.severityOptionSelected,
        pressed && !disabled && styles.buttonPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.severityOptionText,
          selected && styles.severityOptionTextSelected,
        ]}
      >
        {option}
      </Text>
    </Pressable>
  );
}

export default function NewIncidentScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    shiftId?: string;
    closureId?: string;
    saleId?: string;
  }>();

  const shiftId = params.shiftId;
  const closureId = params.closureId;
  const saleId = params.saleId;

  const hasContext = Boolean(shiftId ?? closureId ?? saleId);
  const contextLabel = getContextLabel({ shiftId, closureId, saleId });

  const [type, setType] = useState<IncidentType>("CASH_DIFFERENCE");
  const [severity, setSeverity] = useState<IncidentSeverity>("MEDIUM");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    hasContext &&
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createIncident({
        type,
        severity,
        title: title.trim(),
        description: description.trim(),
        shiftId,
        closureId,
        saleId,
      });

      router.replace("/(staff)/incidents");
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <Text style={styles.menuIcon}>≡</Text>
          <Text style={styles.appBarTitle}>New incident</Text>
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
            <Text style={styles.pageTitle}>New incident</Text>
            <Text style={styles.pageSubtitle}>
              Register issues or notes for administrative review.
            </Text>
          </View>

          {contextLabel ? (
            <View style={styles.contextCard}>
              <Text style={styles.contextIcon}>ⓘ</Text>
              <Text style={styles.contextText}>{contextLabel}</Text>
            </View>
          ) : (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>Missing context</Text>
              <Text style={styles.warningText}>
                Incident must be linked to a shift, sale, or closure before it
                can be created.
              </Text>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.sectionTitle}>TYPE</Text>

              <View style={styles.typeGrid}>
                {INCIDENT_TYPES.map((option) => (
                  <TypeOption
                    key={option}
                    option={option}
                    selected={option === type}
                    disabled={isSubmitting}
                    onPress={() => setType(option)}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.sectionTitle}>SEVERITY</Text>

              <View style={styles.severitySegment}>
                {INCIDENT_SEVERITIES.map((option) => (
                  <SeverityOption
                    key={option}
                    option={option}
                    selected={option === severity}
                    disabled={isSubmitting}
                    onPress={() => setSeverity(option)}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.sectionTitle}>DETAILS</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g., Shortfall in register 1"
                  placeholderTextColor="#6d7a77"
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={styles.descriptionInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe the incident in detail..."
                  placeholderTextColor="#6d7a77"
                  multiline
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  textAlignVertical="top"
                />
              </View>
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
                pressed && canSubmit && styles.buttonPressed,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              <Text style={styles.btnPrimaryText}>
                {isSubmitting ? "Creating…" : "Create incident"}
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
    gap: 10,
  },
  menuIcon: {
    fontSize: 20,
    color: "#00685f",
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#00685f",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#dde1ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bcc9c6",
  },
  avatarText: {
    fontSize: 12,
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
    lineHeight: 22,
    color: "#3d4947",
  },
  contextCard: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eaedff",
    backgroundColor: "#f2f3ff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contextIcon: {
    fontSize: 16,
    fontWeight: "900",
    color: "#3755c3",
  },
  contextText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: "#173bab",
  },
  warningCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0d8a0",
    backgroundColor: "#fff8e6",
    padding: 14,
    gap: 4,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#825100",
  },
  warningText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#825100",
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
  cardBody: {
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#6d7a77",
    letterSpacing: 1.2,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  typeOption: {
    width: "47.5%",
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bcc9c6",
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  typeOptionSelected: {
    borderWidth: 1.5,
    borderColor: "#00685f",
    backgroundColor: "#f2fffc",
  },
  typeOptionText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "800",
    color: "#3d4947",
  },
  typeOptionTextSelected: {
    color: "#00685f",
  },
  typeCheck: {
    fontSize: 12,
    fontWeight: "900",
    color: "#00685f",
  },
  severitySegment: {
    flexDirection: "row",
    borderRadius: 12,
    backgroundColor: "#f2f3ff",
    padding: 4,
  },
  severityOption: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  severityOptionSelected: {
    backgroundColor: "#00685f",
    shadowColor: "#00685f",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 1,
  },
  severityOptionText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#3d4947",
  },
  severityOptionTextSelected: {
    color: "#ffffff",
  },
  inputGroup: {
    gap: 7,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3d4947",
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bcc9c6",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#131b2e",
  },
  descriptionInput: {
    minHeight: 116,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bcc9c6",
    backgroundColor: "#f8fafc",
    padding: 14,
    fontSize: 14,
    lineHeight: 20,
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
    gap: 12,
    paddingTop: 6,
  },
  btnPrimary: {
    height: 52,
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
  btnDisabled: {
    backgroundColor: "#9ecbc7",
    shadowOpacity: 0,
    elevation: 0,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#ffffff",
  },
  btnCancel: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#6d7a77",
  },
  buttonPressed: {
    opacity: 0.72,
  },
});