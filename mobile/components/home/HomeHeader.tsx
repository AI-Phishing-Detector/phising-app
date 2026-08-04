import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../constants/theme";

interface HomeHeaderProps {
  isAuthenticated: boolean;
  onAccountPress: () => void;
}

export function HomeHeader({
  isAuthenticated,
  onAccountPress,
}: HomeHeaderProps) {
  const buttonText = isAuthenticated ? "Profilim" : "Giriş";
  const buttonIcon = isAuthenticated ? "person-outline" : "log-in-outline";
  const accessibilityLabel = isAuthenticated
    ? "Profil ekranını aç"
    : "Giriş ekranını aç";

  return (
    <>
      <View style={styles.topBar}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>AI</Text>
        </View>

        <View style={styles.appIdentity}>
          <Text style={styles.appName}>Phishing Detector</Text>
          <Text style={styles.appSubtitle}>Mobil güvenlik</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={onAccountPress}
          style={({ pressed }) => [
            styles.accountButton,
            pressed && styles.accountButtonPressed,
          ]}
        >
          <Ionicons name={buttonIcon} size={18} color={colors.surface} />

          <Text style={styles.accountButtonText}>{buttonText}</Text>
        </Pressable>
      </View>

      <View style={styles.intro}>
        <Text style={styles.introLabel}>GÜVENLİ BAĞLANTI KONTROLÜ</Text>

        <Text style={styles.heroTitle}>Şüpheli linki açmadan kontrol et.</Text>

        <Text style={styles.heroDescription}>
          SMS, e-posta veya WhatsApp üzerinden gelen bağlantıyı güvenli şekilde
          analiz et.
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  appIdentity: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  appName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  appSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  accountButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: colors.text,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  accountButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  accountButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "700",
  },
  intro: {
    marginTop: 30,
  },
  introLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 36,
    lineHeight: 41,
    fontWeight: "800",
    letterSpacing: -1,
    marginTop: 13,
  },
  heroDescription: {
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
});
