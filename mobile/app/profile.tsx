import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AuthButton } from "../components/auth/AuthButton";
import { AuthScreenLayout } from "../components/auth/AuthScreenLayout";
import { colors } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useScanHistory } from "../context/ScanHistoryContext";
import { triggerSelectionHaptic, triggerSuccessHaptic } from "../utils/haptics";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { items } = useScanHistory();

  const handleLoginPress = () => {
    triggerSelectionHaptic();
    router.replace("/login");
  };

  const handleHistoryPress = () => {
    triggerSelectionHaptic();
    router.push("/history");
  };

  const handleLogout = () => {
    triggerSuccessHaptic();
    signOut();
    router.replace("/");
  };

  if (!user) {
    return (
      <AuthScreenLayout
        title="Oturum Bulunamadı"
        description="Profil bilgilerinizi görüntülemek için hesabınıza giriş yapmanız gerekiyor."
      >
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="person-outline"
              size={32}
              color={colors.textStrong}
            />
          </View>

          <Text style={styles.emptyTitle}>Henüz giriş yapmadınız</Text>

          <Text style={styles.emptyDescription}>
            Giriş yaptıktan sonra profil bilgilerinizi ve tarama geçmişinizi
            görüntüleyebilirsiniz.
          </Text>
        </View>

        <AuthButton
          title="Giriş Yap"
          iconName="log-in-outline"
          onPress={handleLoginPress}
        />
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout
      title="Profilim"
      description="Hesabınıza ait temel bilgileri ve tarama geçmişinizi buradan görüntüleyebilirsiniz."
    >
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PROFİL BİLGİLERİ</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="person-outline"
              size={21}
              color={colors.textStrong}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Ad Soyad</Text>

            <Text style={styles.infoValue}>{user.name}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="mail-outline" size={21} color={colors.textStrong} />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>E-posta</Text>

            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
        </View>
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionLabel}>KİŞİSEL DASHBOARD</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geçmiş taramalarımı aç"
          onPress={handleHistoryPress}
          style={({ pressed }) => [
            styles.historyButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <View style={styles.historyIcon}>
            <Ionicons name="time-outline" size={23} color={colors.surface} />
          </View>

          <View style={styles.historyContent}>
            <Text style={styles.historyTitle}>Geçmiş taramalarım</Text>

            <Text style={styles.historyDescription}>
              Güvenli ve zararlı URL analizlerinizi görüntüleyin.
            </Text>
          </View>

          <View style={styles.historyRight}>
            <View style={styles.historyCount}>
              <Text style={styles.historyCountText}>{items.length}</Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textMuted}
            />
          </View>
        </Pressable>
      </View>

      <View style={styles.sessionNote}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={colors.textSoft}
        />

        <Text style={styles.sessionNoteText}>
          Mevcut girişiniz ve tarama geçmişiniz uygulama açık olduğu sürece
          korunur.
        </Text>
      </View>

      <AuthButton
        title="Çıkış Yap"
        iconName="log-out-outline"
        onPress={handleLogout}
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 2,
  },
  infoCard: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 18,
    backgroundColor: colors.subtle,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  infoContent: {
    flex: 1,
    marginLeft: 13,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    color: colors.textStrong,
    fontSize: 15,
    fontWeight: "700",
  },
  historySection: {
    marginTop: 23,
  },
  historyButton: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 19,
    backgroundColor: colors.subtle,
    padding: 14,
    marginTop: 10,
  },
  buttonPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.99 }],
  },
  historyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.text,
  },
  historyContent: {
    flex: 1,
    marginLeft: 13,
    marginRight: 8,
  },
  historyTitle: {
    color: colors.textStrong,
    fontSize: 15,
    fontWeight: "800",
  },
  historyDescription: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  historyRight: {
    alignItems: "center",
    gap: 7,
  },
  historyCount: {
    minWidth: 28,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 7,
  },
  historyCountText: {
    color: colors.textStrong,
    fontSize: 11,
    fontWeight: "800",
  },
  sessionNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 15,
    backgroundColor: colors.surface,
    padding: 13,
    marginTop: 18,
    marginBottom: 18,
  },
  sessionNoteText: {
    flex: 1,
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    marginBottom: 22,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.subtle,
    marginBottom: 16,
  },
  emptyTitle: {
    color: colors.textStrong,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyDescription: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
});
