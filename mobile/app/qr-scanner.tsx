import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CameraErrorCard } from "../components/qr/CameraErrorCard";
import { CameraPermissionCard } from "../components/qr/CameraPermissionCard";
import { colors } from "../constants/theme";
import { validateUrl } from "../utils/urlValidation";

export default function QrScannerScreen() {
  const router = useRouter();

  const [permission, requestPermission, getPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const [scanError, setScanError] = useState("");
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        await getPermission();
      }
    });

    return () => subscription.remove();
  }, [getPermission]);

  const handlePermissionPress = async () => {
    setPermissionBusy(true);
    setPermissionError("");

    try {
      if (permission?.canAskAgain === false) {
        await Linking.openSettings();
        return;
      }

      const result = await requestPermission();

      if (!result.granted && result.canAskAgain === false) {
        setPermissionError(
          "Kamera izni kalıcı olarak kapatıldı. Ayarlardan kamera iznini açın.",
        );
      }
    } catch {
      setPermissionError(
        "Kamera izni işlemi tamamlanamadı. Lütfen tekrar deneyin.",
      );
    } finally {
      setPermissionBusy(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) {
      return;
    }

    setScanned(true);
    setScanError("");

    const validation = validateUrl(result.data);

    if (!validation.isValid) {
      setScanError(
        validation.error ?? "QR kodun içinde geçerli bir bağlantı bulunamadı.",
      );
      return;
    }

    router.replace({
      pathname: "/",
      params: {
        scannedUrl: validation.cleanedUrl,
      },
    });
  };

  const handleScanAgain = () => {
    setScanned(false);
    setScanError("");
  };

  const handleCameraMountError = ({ message }: { message: string }) => {
    setCameraError(message || "Kamera önizlemesi başlatılamadı.");
  };

  const handleCameraRetry = () => {
    setCameraError("");
    setScanned(false);
    setScanError("");
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="dark" />

        <ActivityIndicator size="large" color={colors.text} />

        <Text style={styles.loadingText}>Kamera izni kontrol ediliyor...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <CameraPermissionCard
        canAskAgain={permission.canAskAgain}
        isBusy={permissionBusy}
        error={permissionError}
        onPrimaryPress={handlePermissionPress}
        onBack={handleBack}
      />
    );
  }

  if (cameraError) {
    return (
      <CameraErrorCard
        message={cameraError}
        onRetry={handleCameraRetry}
        onBack={handleBack}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        onMountError={handleCameraMountError}
      />

      <SafeAreaView style={styles.overlay}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="QR tarayıcısını kapat"
            hitSlop={10}
            onPress={handleBack}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </Pressable>

          <View style={styles.headerTextContainer}>
            <Text style={styles.eyebrow}>AI PHISHING DETECTOR</Text>

            <Text style={styles.title}>QR Kod Tara</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.scannerArea}>
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.topLeftCorner]} />

            <View style={[styles.corner, styles.topRightCorner]} />

            <View style={[styles.corner, styles.bottomLeftCorner]} />

            <View style={[styles.corner, styles.bottomRightCorner]} />
          </View>

          <Text style={styles.instruction}>
            Bağlantı içeren QR kodu çerçevenin içine yerleştirin.
          </Text>
        </View>

        <View style={styles.bottomArea}>
          {scanError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Geçerli bağlantı bulunamadı</Text>

              <Text style={styles.errorText}>{scanError}</Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="QR kodu tekrar tara"
                onPress={handleScanAgain}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.retryButtonText}>Tekrar Tara</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                QR kod okunduğunda bağlantı ana ekrana aktarılacak.
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.text,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: colors.surface,
  },

  loadingText: {
    color: colors.textSoft,
    fontSize: 14,
  },

  overlay: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
  },

  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },

  closeButtonText: {
    color: colors.surface,
    fontSize: 30,
    fontWeight: "300",
    lineHeight: 32,
  },

  headerTextContainer: {
    alignItems: "center",
  },

  eyebrow: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 2.5,
  },

  title: {
    marginTop: 5,
    color: colors.surface,
    fontSize: 20,
    fontWeight: "800",
  },

  headerSpacer: {
    width: 44,
  },

  scannerArea: {
    alignItems: "center",
  },

  scannerFrame: {
    width: 260,
    height: 260,
    position: "relative",
  },

  corner: {
    width: 54,
    height: 54,
    position: "absolute",
    borderColor: colors.surface,
  },

  topLeftCorner: {
    top: 0,
    left: 0,
    borderTopWidth: 6,
    borderLeftWidth: 6,
    borderTopLeftRadius: 22,
  },

  topRightCorner: {
    top: 0,
    right: 0,
    borderTopWidth: 6,
    borderRightWidth: 6,
    borderTopRightRadius: 22,
  },

  bottomLeftCorner: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 6,
    borderLeftWidth: 6,
    borderBottomLeftRadius: 22,
  },

  bottomRightCorner: {
    right: 0,
    bottom: 0,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderBottomRightRadius: 22,
  },

  instruction: {
    maxWidth: 300,
    marginTop: 24,
    color: colors.surface,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    textAlign: "center",
  },

  bottomArea: {
    minHeight: 110,
    justifyContent: "flex-end",
  },

  infoCard: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
  },

  infoText: {
    color: colors.surface,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },

  errorCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },

  errorTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },

  errorText: {
    marginTop: 7,
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 19,
  },

  retryButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: colors.text,
  },

  retryButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "700",
  },

  buttonPressed: {
    opacity: 0.72,
  },
});
