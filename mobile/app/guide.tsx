import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GuideSectionCard } from "../components/guide/GuideSectionCard";
import {
  phishingGuideSections,
  type GuideSectionId,
} from "../constants/phishingGuide";
import { colors } from "../constants/theme";

export default function GuideScreen() {
  const router = useRouter();

  const [expandedSection, setExpandedSection] = useState<GuideSectionId | null>(
    "phishing",
  );

  const handleSectionToggle = (sectionId: GuideSectionId) => {
    setExpandedSection((currentSection) =>
      currentSection === sectionId ? null : sectionId,
    );
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  const handleGoToScanner = () => {
    router.replace("/");
  };

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
              <Text style={styles.backButtonText}>←</Text>
            </Pressable>

            <View style={styles.headerIdentity}>
              <Text style={styles.headerLabel}>BİLGİ PANELİ</Text>

              <Text style={styles.headerTitle}>Phishing Rehberi</Text>
            </View>

            <View style={styles.headerSpace} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>MOBİL GÜVENLİK</Text>
            </View>

            <Text style={styles.heroTitle}>
              Şüpheli bağlantıları daha kolay tanıyın.
            </Text>

            <Text style={styles.heroDescription}>
              Oltalama saldırılarının nasıl çalıştığını öğrenin ve kişisel
              bilgilerinizi korumak için dikkat etmeniz gereken noktaları
              inceleyin.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>REHBER KONULARI</Text>

          <View style={styles.sectionList}>
            {phishingGuideSections.map((section) => (
              <GuideSectionCard
                key={section.id}
                section={section}
                isExpanded={expandedSection === section.id}
                onToggle={() => handleSectionToggle(section.id)}
              />
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bağlantı tarama ekranına dön"
            onPress={handleGoToScanner}
            style={({ pressed }) => [
              styles.scanButton,
              pressed && styles.scanButtonPressed,
            ]}
          >
            <Text style={styles.scanButtonText}>Bağlantı Taramaya Dön</Text>
          </Pressable>

          <Text style={styles.footerNote}>
            Şüpheli bağlantılara tıklamayın ve kişisel bilgilerinizi
            paylaşmayın.
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
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
  },
  content: {
    width: "100%",
    maxWidth: 520,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    color: colors.text,
    fontSize: 23,
    lineHeight: 25,
    fontWeight: "600",
  },
  headerIdentity: {
    flex: 1,
    marginLeft: 13,
  },
  headerLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 3,
  },
  headerSpace: {
    width: 46,
  },
  heroCard: {
    backgroundColor: colors.text,
    borderRadius: 24,
    padding: 21,
    marginTop: 22,
  },
  heroBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  heroBadgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: colors.surface,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 17,
  },
  heroDescription: {
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionList: {
    width: "100%",
  },
  scanButton: {
    minHeight: 57,
    backgroundColor: colors.text,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 8,
  },
  scanButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  scanButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "800",
  },
  buttonPressed: {
    backgroundColor: colors.subtle,
    opacity: 0.8,
  },
  footerNote: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 17,
    paddingHorizontal: 16,
  },
});
