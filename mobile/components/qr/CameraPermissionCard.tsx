import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "../../constants/theme";

type CameraPermissionCardProps = {
  canAskAgain: boolean;
  isBusy: boolean;
  error: string;
  onPrimaryPress: () => void;
  onBack: () => void;
};

export function CameraPermissionCard({
  canAskAgain,
  isBusy,
  error,
  onPrimaryPress,
  onBack,
}: CameraPermissionCardProps) {
  const title = canAskAgain ? "Kamera izni gerekli" : "Kamera izni kapalı";

  const description = canAskAgain
    ? "QR kodları tarayabilmek için uygulamanın kameraya erişmesine izin vermelisiniz."
    : "Kamera izni cihaz ayarlarından kapatılmış. QR kod tarayabilmek için uygulama ayarlarından kamera iznini açın.";

  const buttonLabel = canAskAgain ? "Kamera İzni Ver" : "Ayarları Aç";

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>QR</Text>
        </View>

        <Text style={styles.title}>{title}</Text>

        <Text style={styles.description}>{description}</Text>

        {!canAskAgain ? (
          <View style={styles.settingsNote}>
            <Text style={styles.settingsNoteText}>
              Ayarları açtıktan sonra kamera iznini etkinleştirip uygulamaya
              geri dönün.
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
          disabled={isBusy}
          onPress={onPrimaryPress}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && !isBusy && styles.buttonPressed,
            isBusy && styles.buttonDisabled,
          ]}
        >
          {isBusy ? (
            <View style={styles.loadingContent}>
              <ActivityIndicator color={colors.surface} />
              <Text style={styles.primaryButtonText}>Bekleyin...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="QR tarama ekranından geri dön"
          disabled={isBusy}
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && !isBusy && styles.buttonPressed,
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
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    color: colors.surface,
    fontSize: 18,
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
  settingsNote: {
    width: "100%",
    backgroundColor: colors.subtle,
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
  },
  settingsNoteText: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  errorBox: {
    width: "100%",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  primaryButton: {
    width: "100%",
    minHeight: 55,
    backgroundColor: colors.text,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 9,
  },
  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
  buttonDisabled: {
    opacity: 0.55,
  },
});
