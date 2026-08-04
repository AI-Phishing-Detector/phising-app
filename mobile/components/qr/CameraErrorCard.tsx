import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "../../constants/theme";

type CameraErrorCardProps = {
  message: string;
  onRetry: () => void;
  onBack: () => void;
};

export function CameraErrorCard({
  message,
  onRetry,
  onBack,
}: CameraErrorCardProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>!</Text>
        </View>

        <Text style={styles.title}>Kamera başlatılamadı</Text>

        <Text style={styles.description}>
          Kamera şu anda kullanılamıyor. Başka bir uygulamanın kamerayı
          kullanmadığından emin olup tekrar deneyin.
        </Text>

        {message ? (
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>TEKNİK AYRINTI</Text>
            <Text style={styles.detailText}>{message}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kamerayı tekrar başlat"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="QR tarama ekranından geri dön"
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.subtle,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 26,
    padding: 22,
    alignItems: "center",
  },
  icon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: "800",
  },
  title: {
    color: colors.text,
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 18,
  },
  description: {
    color: "#626262",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
  },
  detailBox: {
    width: "100%",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 14,
    padding: 13,
    marginTop: 17,
  },
  detailLabel: {
    color: colors.danger,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  detailText: {
    color: "#7f1d1d",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  retryButton: {
    width: "100%",
    minHeight: 55,
    backgroundColor: colors.text,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  retryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "800",
  },
  backButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  backButtonText: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.75,
  },
});
