/**
 * Shift Control design system — color tokens.
 *
 * Single source of truth for every color used in the app.
 * Import from "@/src/theme" rather than from this file directly.
 */
export const colors = {
  // ── Backgrounds ────────────────────────────────────────────
  background: "#faf8ff",
  surface: "#ffffff",
  surfaceMuted: "#f2f3ff",
  surfaceSoft: "#f8fafc",

  // ── Borders ─────────────────────────────────────────────────
  border: "#d8e0dd",
  borderSoft: "#eaedff",
  borderStrong: "#bcc9c6",

  // ── Primary (teal) ──────────────────────────────────────────
  primary: "#00685f",
  primaryDark: "#005049",
  primarySoft: "#edf8f6",
  primaryMuted: "#d2f5f0",
  primaryDisabled: "#9ecbc7",

  // ── Secondary (blue / indigo) ───────────────────────────────
  secondary: "#3755c3",
  secondaryDark: "#00217a",
  secondarySoft: "#dde1ff",
  secondaryContainer: "#708cfd",

  // ── Text ────────────────────────────────────────────────────
  text: "#131b2e",
  textMuted: "#3d4947",
  textSubtle: "#6d7a77",

  // ── Semantic ────────────────────────────────────────────────
  danger: "#ba1a1a",
  dangerSoft: "#ffdad6",
  warning: "#825100",
  warningSoft: "#fff8e6",
  warningBorder: "#f0d8a0",
} as const;
