import React from "react";
import { View, Text } from "react-native";
import { commonStyles } from "@/src/theme";

type StatusBadgeProps = {
  active: boolean;
};

/**
 * Badge pequeño para indicar estado active/inactive.
 * Usado en listas y detalles de usuarios, stores, etc.
 *
 * @example
 * <StatusBadge active={user.active} />
 */
export function StatusBadge({ active }: StatusBadgeProps) {
  return (
    <View
      style={[
        commonStyles.statusBadge,
        active
          ? commonStyles.statusBadgeActive
          : commonStyles.statusBadgeInactive,
      ]}
    >
      <Text
        style={[
          commonStyles.statusBadgeText,
          active
            ? commonStyles.statusBadgeTextActive
            : commonStyles.statusBadgeTextInactive,
        ]}
      >
        {active ? "ACTIVE" : "INACTIVE"}
      </Text>
    </View>
  );
}
