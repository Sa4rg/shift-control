import { StyleSheet } from "react-native";
import { colors } from "./colors";
import { fontSize, fontWeight } from "./typography";
import { radius } from "./radius";
import { shadows } from "./shadows";

/**
 * Shared semantic style presets.
 *
 * These represent the visual baseline for the app, derived from the
 * Create Store screen (app/(admin)/stores/new-store.tsx) as reference.
 *
 * Usage: import { commonStyles } from "@/src/theme";
 */
export const commonStyles = StyleSheet.create({
  // ─── Safe area ────────────────────────────────────────────────────────────
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ─── App bar ──────────────────────────────────────────────────────────────
  appBar: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  appBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  appBarTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },

  // ─── Avatar (compact 36 px) ───────────────────────────────────────────────
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.secondaryDark,
  },

  // ─── Screen content ───────────────────────────────────────────────────────
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    gap: 16,
  },
  pageHeader: {
    gap: 5,
  },
  pageTitle: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    lineHeight: 22,
  },

  // ─── Cards ────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.card,
  },
  cardBody: {
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  cardTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  // ─── Section title ────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },

  // ─── Inputs ───────────────────────────────────────────────────────────────
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    fontSize: fontSize.lg,
    color: colors.text,
  },

  // ─── Buttons ──────────────────────────────────────────────────────────────
  primaryButton: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primaryButton,
  },
  primaryButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.extrabold,
    color: colors.surface,
  },
  outlineButton: {
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  outlineButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  secondaryButton: {
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  buttonPressed: {
    opacity: 0.72,
  },

  // ─── Chips / filter tabs ──────────────────────────────────────────────────
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.surface,
  },

  // ─── Filter labels ────────────────────────────────────────────────────────
  filterLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSubtle,
    letterSpacing: 0.3,
  },

  // ─── Empty states ─────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 6,
  },
  emptyTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  emptyText: {
    fontSize: fontSize.base,
    lineHeight: 20,
    color: colors.textMuted,
  },

  // ─── Detail rows ──────────────────────────────────────────────────────────
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSubtle,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    lineHeight: 20,
  },
});
