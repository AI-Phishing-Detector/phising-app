import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthButton } from "../components/auth/AuthButton";
import { AuthScreenLayout } from "../components/auth/AuthScreenLayout";
import { colors } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useScanHistory } from "../context/ScanHistoryContext";
import { triggerSelectionHaptic } from "../utils/haptics";

function formatScanDate(scannedAt: string) {
  const date = new Date(scannedAt);

  const dateText = date.toLocaleDateString("tr-TR");
  const timeText = date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dateText} • ${timeText}`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { items } = useScanHistory();

  const totalCount = items.length;

  const safeCount = items.filter((item) => item.verdict === "safe").length;

  const dangerousCount = items.filter(
    (item) => item.verdict === "dangerous",
  ).length;

  const handleBack = () => {
    triggerSelectionHaptic();

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  const handleLoginPress = () => {
    triggerSelectionHaptic();
    router.replace("/login");
  };

  const handleHomePress = () => {
    triggerSelectionHaptic();
    router.replace("/");
  };

  if (!user) {
    return (
      <AuthScreenLayout
        title="Oturum Bulunamadı"
        description="Tarama geçmişinizi görüntülemek için hesabınıza giriş yapmanız gerekiyor."
      >
        <View style={styles.unauthorizedState}>
          <View style={styles.unauthorizedIcon}>
            <Ionicons name="time-outline" size={34} color={colors.textStrong} />
          </View>

          <Text style={styles.unauthorizedTitle}>Geçmişe erişilemiyor</Text>

          <Text style={styles.unauthorizedDescription}>
            Giriş yaptıktan sonra gerçekleştirdiğiniz başarılı URL taramaları
            burada listelenecek.
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Geri dön"
              hitSlop={10}
              onPress={handleBack}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={colors.textStrong}
              />
            </Pressable>

            <View style={styles.headerIdentity}>
              <Text style={styles.headerLabel}>AI PHISHING DETECTOR</Text>

              <Text style={styles.headerTitle}>Mobil URL Tarama</Text>
            </View>

            <View style={styles.headerSpace} />
          </View>

          <View style={styles.intro}>
            <Text style={styles.introLabel}>KİŞİSEL DASHBOARD</Text>

            <Text style={styles.pageTitle}>Geçmiş taramalarım</Text>

            <Text style={styles.pageDescription}>
              Hesabınızla gerçekleştirdiğiniz URL analizlerini ve
              güvenli/zararlı dağılımını görüntüleyin.
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.cardTitle}>Tarama özeti</Text>

                <Text style={styles.cardDescription}>
                  Güncel tarama dağılımınız
                </Text>
              </View>

              <View style={styles.totalBadge}>
                <Text style={styles.totalBadgeText}>{totalCount} toplam</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.totalIcon}>
                  <Ionicons
                    name="analytics-outline"
                    size={19}
                    color={colors.surface}
                  />
                </View>

                <Text style={styles.statValue}>{totalCount}</Text>

                <Text style={styles.statLabel}>Toplam</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.dangerIcon}>
                  <Ionicons
                    name="warning-outline"
                    size={19}
                    color={colors.surface}
                  />
                </View>

                <Text style={styles.statValue}>{dangerousCount}</Text>

                <Text style={styles.statLabel}>Zararlı</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.safeIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={19}
                    color={colors.surface}
                  />
                </View>

                <Text style={styles.statValue}>{safeCount}</Text>

                <Text style={styles.statLabel}>Güvenli</Text>
              </View>
            </View>

            <View style={styles.distributionSection}>
              <View style={styles.distributionHeader}>
                <Text style={styles.distributionLabel}>Sonuç dağılımı</Text>

                <Text style={styles.distributionTotal}>
                  {totalCount === 0
                    ? "Henüz veri yok"
                    : `${dangerousCount} zararlı • ${safeCount} güvenli`}
                </Text>
              </View>

              <View style={styles.distributionTrack}>
                {totalCount === 0 ? (
                  <View style={styles.emptyDistribution} />
                ) : (
                  <>
                    <View
                      style={[
                        styles.dangerDistribution,
                        {
                          flex: dangerousCount,
                        },
                      ]}
                    />

                    <View
                      style={[
                        styles.safeDistribution,
                        {
                          flex: safeCount,
                        },
                      ]}
                    />
                  </>
                )}
              </View>

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={styles.dangerDot} />

                  <Text style={styles.legendText}>Zararlı</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={styles.safeDot} />

                  <Text style={styles.legendText}>Güvenli</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <View>
                <Text style={styles.cardTitle}>Son taramalar</Text>

                <Text style={styles.cardDescription}>
                  En yeni analizler üstte gösterilir
                </Text>
              </View>

              <Ionicons
                name="time-outline"
                size={24}
                color={colors.textMuted}
              />
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="search-outline"
                    size={31}
                    color={colors.textStrong}
                  />
                </View>

                <Text style={styles.emptyTitle}>Henüz kayıtlı tarama yok</Text>

                <Text style={styles.emptyDescription}>
                  Ana ekrandan bir URL taradığınızda sonuç burada listelenecek.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="URL tarama ekranına dön"
                  onPress={handleHomePress}
                  style={({ pressed }) => [
                    styles.homeButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Ionicons
                    name="scan-outline"
                    size={19}
                    color={colors.surface}
                  />

                  <Text style={styles.homeButtonText}>URL Tara</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.historyList}>
                {items.map((item) => {
                  const isSafe = item.verdict === "safe";

                  return (
                    <View key={item.id} style={styles.historyCard}>
                      <View style={styles.historyTopRow}>
                        <View
                          style={[
                            styles.verdictBadge,
                            isSafe ? styles.safeBadge : styles.dangerBadge,
                          ]}
                        >
                          <Ionicons
                            name={
                              isSafe
                                ? "shield-checkmark-outline"
                                : "warning-outline"
                            }
                            size={16}
                            color={isSafe ? "#15803d" : colors.danger}
                          />

                          <Text
                            style={[
                              styles.verdictText,
                              isSafe
                                ? styles.safeVerdictText
                                : styles.dangerVerdictText,
                            ]}
                          >
                            {isSafe ? "Güvenli" : "Zararlı"}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.riskBadge,
                            isSafe
                              ? styles.safeRiskBadge
                              : styles.dangerRiskBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.riskText,
                              isSafe
                                ? styles.safeRiskText
                                : styles.dangerRiskText,
                            ]}
                          >
                            %{Math.round(item.riskScore)} risk
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.historyUrl} numberOfLines={2}>
                        {item.url}
                      </Text>

                      <Text style={styles.historyMessage} numberOfLines={2}>
                        {item.message}
                      </Text>

                      <View style={styles.historyFooter}>
                        <Ionicons
                          name="calendar-outline"
                          size={15}
                          color={colors.textMuted}
                        />

                        <Text style={styles.historyDate}>
                          {formatScanDate(item.scannedAt)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <Text style={styles.localNotice}>
            Geçmiş kayıtları şimdilik uygulama açık olduğu sürece korunur.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 34,
  },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  backButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  buttonPressed: {
    opacity: 0.55,
    transform: [{ scale: 0.98 }],
  },
  headerIdentity: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  headerLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 2.5,
  },
  headerTitle: {
    color: colors.textStrong,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 5,
  },
  headerSpace: {
    width: 42,
  },
  intro: {
    marginBottom: 24,
  },
  introLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.5,
  },
  pageTitle: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    marginTop: 10,
  },
  pageDescription: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 25,
    backgroundColor: colors.surface,
    padding: 18,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 9,
    },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    color: colors.textStrong,
    fontSize: 19,
    fontWeight: "800",
  },
  cardDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  totalBadge: {
    borderRadius: 999,
    backgroundColor: colors.text,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  totalBadgeText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 19,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 18,
    backgroundColor: colors.subtle,
    paddingHorizontal: 5,
    paddingVertical: 14,
  },
  totalIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.text,
  },
  dangerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
  },
  safeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16a34a",
  },
  statValue: {
    color: colors.textStrong,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 9,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  distributionSection: {
    marginTop: 20,
  },
  distributionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  distributionLabel: {
    color: colors.textStrong,
    fontSize: 13,
    fontWeight: "700",
  },
  distributionTotal: {
    flexShrink: 1,
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "right",
  },
  distributionTrack: {
    height: 11,
    flexDirection: "row",
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: colors.subtle,
    marginTop: 11,
  },
  emptyDistribution: {
    flex: 1,
    backgroundColor: colors.borderLight,
  },
  dangerDistribution: {
    backgroundColor: "#ef4444",
  },
  safeDistribution: {
    backgroundColor: "#16a34a",
  },
  legendRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dangerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  safeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16a34a",
  },
  legendText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  recentSection: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 25,
    backgroundColor: colors.surface,
    padding: 18,
    marginTop: 16,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 17,
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 19,
    backgroundColor: colors.subtle,
    padding: 15,
  },
  historyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  verdictBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  safeBadge: {
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
  },
  dangerBadge: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  verdictText: {
    fontSize: 11,
    fontWeight: "800",
  },
  safeVerdictText: {
    color: "#15803d",
  },
  dangerVerdictText: {
    color: colors.danger,
  },
  riskBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  safeRiskBadge: {
    backgroundColor: "#dcfce7",
  },
  dangerRiskBadge: {
    backgroundColor: "#fee2e2",
  },
  riskText: {
    fontSize: 11,
    fontWeight: "800",
  },
  safeRiskText: {
    color: "#15803d",
  },
  dangerRiskText: {
    color: colors.danger,
  },
  historyUrl: {
    color: colors.textStrong,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    marginTop: 13,
  },
  historyMessage: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
  historyFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  historyDate: {
    color: colors.textMuted,
    fontSize: 11,
  },
  emptyState: {
    alignItems: "center",
    borderRadius: 19,
    backgroundColor: colors.subtle,
    paddingHorizontal: 20,
    paddingVertical: 27,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyTitle: {
    color: colors.textStrong,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 15,
  },
  emptyDescription: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 7,
  },
  homeButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 14,
    backgroundColor: colors.text,
    paddingHorizontal: 20,
    marginTop: 19,
  },
  homeButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800",
  },
  localNotice: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 18,
    paddingHorizontal: 18,
  },
  unauthorizedState: {
    alignItems: "center",
    marginBottom: 22,
  },
  unauthorizedIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.subtle,
    marginBottom: 16,
  },
  unauthorizedTitle: {
    color: colors.textStrong,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  unauthorizedDescription: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
});
