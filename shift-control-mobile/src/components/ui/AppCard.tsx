import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { commonStyles } from "@/src/theme";

type AppCardProps = {
  title?: string;
  children: React.ReactNode;
};

/**
 * Componente de card reutilizable siguiendo el diseño estándar de la app.
 * Usa commonStyles para consistencia visual.
 *
 * @example
 * <AppCard title="Account">
 *   <DetailRow label="FULL NAME" value={user.fullName} />
 * </AppCard>
 *
 * @example Sin título
 * <AppCard>
 *   <Text>Contenido personalizado</Text>
 * </AppCard>
 */
export function AppCard({ title, children }: AppCardProps) {
  return (
    <View style={commonStyles.card}>
      {title ? (
        <View style={commonStyles.cardHeader}>
          <Text style={commonStyles.cardTitle}>{title}</Text>
        </View>
      ) : null}
      <View style={commonStyles.cardBody}>{children}</View>
    </View>
  );
}
