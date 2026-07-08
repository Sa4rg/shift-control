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
  helpText: {
    fontSize: fontSize.md,
    lineHeight: 19,
    color: colors.textMuted,
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
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    backgroundColor: colors.primaryDisabled,
    shadowOpacity: 0,
    elevation: 0,
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
    fontWeight: fontWeight.semibold,
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
  dangerButton: {
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  dangerButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.danger,
    letterSpacing: 0.05,
  },
  textButton: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  textButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
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

  // ─── Detail rows (label + value pattern) ──────────────────────────────────
  detailRow: {
    gap: 5,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: fontWeight.extrabold,
    color: colors.textSubtle,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    lineHeight: 21,
  },

  // ─── Status badges (pequeños, para active/inactive) ───────────────────────
  statusBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeActive: {
    backgroundColor: colors.primaryMuted,
  },
  statusBadgeInactive: {
    backgroundColor: "#dae2fd",
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extrabold,
    letterSpacing: 0.4,
  },
  statusBadgeTextActive: {
    color: colors.primaryDark,
  },
  statusBadgeTextInactive: {
    color: colors.textMuted,
  },

  // ─── List cards (cards con múltiples rows) ────────────────────────────────
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.card,
  },
  listRow: {
    minHeight: 88,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  listRowInactive: {
    opacity: 0.72,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  // ─── Section containers ───────────────────────────────────────────────────
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extrabold,
    color: colors.textSubtle,
    letterSpacing: 1,
  },

  // ─── Action buttons (refresh, back, etc.) ─────────────────────────────────
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 4,
  },
  btnRefresh: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: "#89f5e7",
    alignItems: "center",
    justifyContent: "center",
  },
  btnRefreshText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  btnBack: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  btnBackText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },

  // ─── Filter card ──────────────────────────────────────────────────────────
  filterCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
    ...shadows.card,
  },
  filterOptions: {
    flexDirection: "row",
    gap: 8,
  },
});
