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
import { colors, commonStyles, fontWeight, fontSize, radius } from "@/src/theme";
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
        pressed && !disabled && commonStyles.buttonPressed,
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
        pressed && !disabled && commonStyles.buttonPressed,
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
    <SafeAreaView style={commonStyles.safeArea}>
      <AppTopBar variant="back" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={commonStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={commonStyles.pageHeader}>
            <Text style={commonStyles.pageTitle}>New incident</Text>
            <Text style={commonStyles.pageSubtitle}>
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

          <View style={commonStyles.card}>
            <View style={commonStyles.cardBody}>
              <Text style={commonStyles.sectionTitle}>TYPE</Text>

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

          <View style={commonStyles.card}>
            <View style={commonStyles.cardBody}>
              <Text style={commonStyles.sectionTitle}>SEVERITY</Text>

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

          <View style={commonStyles.card}>
            <View style={commonStyles.cardBody}>
              <Text style={commonStyles.sectionTitle}>DETAILS</Text>

              <View style={commonStyles.inputGroup}>
                <Text style={commonStyles.inputLabel}>Title</Text>
                <TextInput
                  style={commonStyles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g., Shortfall in register 1"
                  placeholderTextColor="#6d7a77"
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
              </View>

              <View style={commonStyles.inputGroup}>
                <Text style={commonStyles.inputLabel}>Description</Text>
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

          <View style={commonStyles.actions}>
            <Pressable
              style={({ pressed }) => [
                commonStyles.primaryButton,
                !canSubmit && commonStyles.buttonDisabled,
                pressed && canSubmit && commonStyles.buttonPressed,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              <Text style={commonStyles.primaryButtonText}>
                {isSubmitting ? "Creating…" : "Create incident"}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnCancel,
                pressed && commonStyles.buttonPressed,
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
  keyboardView: {
    flex: 1,
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
});