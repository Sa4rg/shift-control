import React from "react";
import { View, Text, TextStyle } from "react-native";
import { commonStyles } from "@/src/theme";

type DetailRowProps = {
  label: string;
  value?: string | null | undefined;
  valueStyle?: TextStyle;
  children?: React.ReactNode;
};

/**
 * Componente para mostrar un par label/value siguiendo el patrón común de la app.
 * El label siempre es uppercase y con estilo consistente.
 *
 * @example Con value como string
 * <DetailRow label="FULL NAME" value={user.fullName} />
 *
 * @example Con value personalizado (e.g., badge)
 * <DetailRow label="ROLE">
 *   <RoleBadge role={user.role} />
 * </DetailRow>
 *
 * @example Con estilo custom para el value
 * <DetailRow
 *   label="STATUS"
 *   value="Active"
 *   valueStyle={{ color: colors.primary }}
 * />
 */
export function DetailRow({
  label,
  value,
  valueStyle,
  children,
}: DetailRowProps) {
  // Si no hay value ni children, no renderizar nada
  if (!value && !children) {
    return null;
  }

  return (
    <View style={commonStyles.detailRow}>
      <Text style={commonStyles.detailLabel}>{label}</Text>
      {children ? (
        children
      ) : (
        <Text style={[commonStyles.detailValue, valueStyle]}>{value}</Text>
      )}
    </View>
  );
}
