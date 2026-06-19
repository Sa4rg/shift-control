import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

type SecureTextInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  maxLength?: number;
};

export function SecureTextInput({
  value,
  onChangeText,
  placeholder,
  disabled = false,
  keyboardType,
  maxLength,
}: SecureTextInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  function handleToggleVisibility() {
    if (disabled) {
      return;
    }

    setIsVisible((currentValue) => !currentValue);
  }

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      <TextInput
        testID="secure-text-input"
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9EACAA"
        secureTextEntry={!isVisible}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        keyboardType={keyboardType}
        maxLength={maxLength}
      />

      <Pressable
        style={({ pressed }) => [
          styles.visibilityButton,
          pressed && !disabled && styles.visibilityButtonPressed,
        ]}
        onPress={handleToggleVisibility}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={
          isVisible ? "Hide secure value" : "Show secure value"
        }
      >
        <Text style={styles.visibilityButtonText}>
          {isVisible ? "Hide" : "Show"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#d8e0dd",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  containerDisabled: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    height: "100%",
    paddingLeft: 16,
    paddingRight: 8,
    fontSize: 16,
    color: "#131b2e",
  },
  visibilityButton: {
    height: "100%",
    minWidth: 64,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  visibilityButtonPressed: {
    opacity: 0.6,
  },
  visibilityButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#00685f",
  },
});