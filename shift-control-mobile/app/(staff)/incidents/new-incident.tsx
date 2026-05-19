import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/src/api/errors";
import { createIncident } from "@/src/api/incidents";
import { Button } from "@/src/components/Button";
import { ErrorMessage } from "@/src/components/ErrorMessage";
import { Screen } from "@/src/components/Screen";
import { TextField } from "@/src/components/TextField";
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

export default function NewIncidentScreen() {
  const params = useLocalSearchParams<{ shiftId?: string; closureId?: string; saleId?: string }>();
  const shiftId = params.shiftId;
  const closureId = params.closureId;
  const saleId = params.saleId;

  const hasContext = !!(shiftId ?? closureId ?? saleId);

  const [type, setType] = useState<IncidentType>("OPERATIONAL_NOTE");
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
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>New incident</Text>
            <Text style={styles.subtitle}>
              Register an operational note, mismatch, or issue for admin review.
            </Text>
          </View>

          {!hasContext ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>
                Incident must be linked to a shift, sale, or closure.
              </Text>
            </View>
          ) : null}

          {shiftId ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Linked to current shift</Text>
              <Text style={styles.infoText}>Shift {shiftId.slice(0, 8)}</Text>
            </View>
          ) : null}

          {closureId ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Linked to closure</Text>
              <Text style={styles.infoText}>Closure {closureId.slice(0, 8)}</Text>
            </View>
          ) : null}

          {saleId ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Linked to sale</Text>
              <Text style={styles.infoText}>Sale {saleId.slice(0, 8)}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Type</Text>

            <View style={styles.options}>
              {INCIDENT_TYPES.map((option) => (
                <Button
                  key={option}
                  title={option === type ? `✓ ${option}` : option}
                  onPress={() => setType(option)}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Severity</Text>

            <View style={styles.options}>
              {INCIDENT_SEVERITIES.map((option) => (
                <Button
                  key={option}
                  title={option === severity ? `✓ ${option}` : option}
                  onPress={() => setSeverity(option)}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Details</Text>

            <TextField
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="Example: Cash short by 5 EUR"
              autoCapitalize="sentences"
            />

            <TextField
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Explain what happened"
              autoCapitalize="sentences"
            />

            <ErrorMessage message={errorMessage} />

            <Button
              title="Create incident"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={!canSubmit}
            />
          </View>

          <View style={styles.actions}>
            <Button
              title="Cancel"
              onPress={() => router.back()}
              disabled={isSubmitting}
            />
          </View>
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
  options: {
    gap: 8,
  },
  warningCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#f0d28a",
    borderRadius: 16,
    padding: 20,
    backgroundColor: "#fff8e5",
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#7a5200",
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
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
});