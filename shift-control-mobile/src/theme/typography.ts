/**
 * Shift Control design system — typography tokens.
 *
 * Font weight scale (use the named constants, avoid bare strings):
 *
 *   regular   "400"  — body text, captions
 *   medium    "500"  — secondary labels
 *   semibold  "600"  — meta text, secondary actions
 *   bold      "700"  — page titles, card titles, primary values, action labels
 *   extrabold "800"  — section labels (uppercase), button text, badge labels
 *
 * ⚠ Avoid "900" (black). Reserved for very small compact badges where
 * visual weight must be maximised at tiny sizes.
 *
 * Import from "@/src/theme" rather than from this file directly.
 */
export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
} as const;

/**
 * Font size scale (in px / dp).
 *
 * Use these values instead of bare numbers when setting fontSize.
 */
export const fontSize = {
  xs: 10,
  sm: 12,
  md: 13,
  base: 14,
  lg: 15,
  xl: 16,
  xxl: 18,
  display: 28,
} as const;
