import React from "react";
import { View, Text } from "react-native";
import { commonStyles } from "@/src/theme";

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

/**
 * Contenedor de sección con título uppercase.
 * Usado para agrupar contenido con un label descriptivo.
 *
 * @example
 * <Section title="ADMINS">
 *   <View style={commonStyles.listCard}>
 *     {adminUsers.map(...)}
 *   </View>
 * </Section>
 */
export function Section({ title, children }: SectionProps) {
  return (
    <View style={commonStyles.section}>
      <Text style={commonStyles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}
