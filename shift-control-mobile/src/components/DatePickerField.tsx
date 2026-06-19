import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, fontSize, fontWeight, radius } from "@/src/theme";
import {
  formatLocalDateAsIso,
  parseIsoDateAsLocalDate,
} from "@/src/utils/isoDate";

type DatePickerFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minimumDate?: string;
  maximumDate?: string;
};

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  minimumDate,
  maximumDate,
}: DatePickerFieldProps) {
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const selectedDate =
    parseIsoDateAsLocalDate(value) ?? new Date();

  const parsedMinimumDate = minimumDate
    ? parseIsoDateAsLocalDate(minimumDate) ?? undefined
    : undefined;

  const parsedMaximumDate = maximumDate
    ? parseIsoDateAsLocalDate(maximumDate) ?? undefined
    : undefined;

  function handleOpenPicker() {
    if (disabled) {
      return;
    }

    setIsPickerVisible(true);
  }

  function handleDateChange(
    event: DateTimePickerEvent,
    selectedValue?: Date
  ) {
    if (Platform.OS === "android") {
      setIsPickerVisible(false);
    }

    if (event.type !== "set" || !selectedValue) {
      return;
    }

    onChange(formatLocalDateAsIso(selectedValue));
  }

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        testID="date-picker-field"
        style={({ pressed }) => [
          styles.field,
          disabled && styles.fieldDisabled,
          pressed && !disabled && styles.fieldPressed,
        ]}
        onPress={handleOpenPicker}
        disabled={disabled}
      >
        <Text
          style={[
            styles.valueText,
            value.length === 0 && styles.placeholderText,
          ]}
        >
          {value.length > 0 ? value : placeholder}
        </Text>

        <Text style={styles.calendarIcon}>▣</Text>
      </Pressable>

      {isPickerVisible ? (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          minimumDate={parsedMinimumDate}
          maximumDate={parsedMaximumDate}
          onChange={handleDateChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSubtle,
  },
  field: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  fieldDisabled: {
    opacity: 0.5,
  },
  fieldPressed: {
    opacity: 0.72,
  },
  valueText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
  },
  placeholderText: {
    color: colors.textSubtle,
  },
  calendarIcon: {
    fontSize: fontSize.xl,
    color: colors.primary,
  },
});