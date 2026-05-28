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
import { AppTopBar } from "@/src/components/AppTopBar";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { colors, fontWeight, fontSize, shadows, radius } from "@/src/theme";
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppTopBar variant="back" />

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
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
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
    lineHeight: 22,
    color: colors.textMuted,
  },
  contextCard: {
    minHeight: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contextIcon: {
    fontSize: fontSize.xl,
    fontWeight: "900",
    color: colors.secondary,
  },
  contextText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: "#173bab",
  },
  warningCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningSoft,
    padding: 14,
    gap: 4,
  },
  warningTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.extrabold,
    color: colors.warning,
  },
  warningText: {
    fontSize: fontSize.md,
    lineHeight: 19,
    color: colors.warning,
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
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extrabold,
    color: colors.textSubtle,
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
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
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
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  typeOptionTextSelected: {
    color: colors.primary,
  },
  typeCheck: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
  },
  severitySegment: {
    flexDirection: "row",
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
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
    backgroundColor: colors.primary,
    shadowColor: "#00685f",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 1,
  },
  severityOptionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extrabold,
    color: colors.textMuted,
  },
  severityOptionTextSelected: {
    color: colors.surface,
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
    fontSize: fontSize.base,
    color: colors.text,
  },
  descriptionInput: {
    minHeight: 116,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    padding: 14,
    fontSize: fontSize.base,
    lineHeight: 20,
    color: colors.text,
  },
  errorCard: {
    borderRadius: radius.lg,
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
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  buttonPressed: {
    opacity: 0.72,
  },
});