/**
 * Shift Control design system — shadow presets.
 *
 * Spread into a StyleSheet entry alongside the other style properties.
 * Import from "@/src/theme" rather than from this file directly.
 *
 * @example
 * ```ts
 * card: {
 *   backgroundColor: colors.surface,
 *   borderRadius: radius.xl,
 *   ...shadows.card,
 * }
 * ```
 */
export const shadows = {
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryButton: {
    shadowColor: "#00685f",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
};
