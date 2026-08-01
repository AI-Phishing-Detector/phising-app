import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../constants/theme";

type GuideShortcutCardProps = {
  onPress: () => void;
};

export function GuideShortcutCard({ onPress }: GuideShortcutCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Phishing rehberini aç"
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
    >
      <View style={styles.icon}>
        <Text style={styles.iconText}>i</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>BİLGİ PANELİ</Text>
        <Text style={styles.title}>Phishing Rehberi</Text>
        <Text style={styles.description}>
          Şüpheli bağlantıları tanımayı ve korunmayı öğren.
        </Text>
      </View>

      <View style={styles.arrowBadge}>
        <Text style={styles.arrowText}>→</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 104,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 20,
    padding: 15,
    marginTop: 14,
  },
  containerPressed: {
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    transform: [{ scale: 0.99 }],
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: "800",
    fontStyle: "italic",
  },
  content: {
    flex: 1,
    marginHorizontal: 13,
  },
  label: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 3,
  },
  description: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  arrowBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.subtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
});
