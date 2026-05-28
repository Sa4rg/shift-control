import { router } from "expo-router";
import { Platform, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/src/auth/AuthContext";
import { colors, fontWeight, fontSize } from "@/src/theme";

const ANDROID_TOP = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

type AppTopBarProps = {
  title?: string;
  subtitle?: string;
  variant?: "root" | "back" | "home" | "none";
  homeHref?: string;
};

export function AppTopBar({
  title = "Shift Control",
  subtitle,
  variant = "root",
  homeHref,
}: AppTopBarProps) {
  const { user } = useAuth();

  const displayName = user?.fullName ?? user?.username ?? "U";
  const initials =
    displayName
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "U";

  function handleLeftPress() {
    if (variant === "back") {
      router.back();
    } else if (variant === "home" && homeHref) {
      router.replace(homeHref as never);
    }
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.content}>
        <View style={styles.left}>
          {variant === "back" || variant === "home" ? (
            <Pressable
              style={({ pressed }) => [
                styles.leftButton,
                pressed && styles.pressed,
              ]}
              onPress={handleLeftPress}
              hitSlop={8}
            >
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
          ) : null}
          <View style={styles.titleGroup}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    paddingTop: ANDROID_TOP + 8,
  },
  content: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  titleGroup: {
    flex: 1,
  },
  leftButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.72,
  },
  backIcon: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 1,
  },
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
});
