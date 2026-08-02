import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScanResultCard } from "../components/ScanResultCard";
import { GuideShortcutCard } from "../components/home/GuideShortcutCard";
import { HomeHeader } from "../components/home/HomeHeader";
import { ScanCard } from "../components/home/ScanCard";
import { SecurityNote } from "../components/home/SecurityNote";
import { colors } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useScanHistory } from "../context/ScanHistoryContext";
import { scanUrl, UserFacingError } from "../services/scanService";
import type { ScanResult } from "../types/scan";
import {
  triggerErrorHaptic,
  triggerSelectionHaptic,
  triggerSuccessHaptic,
  triggerWarningHaptic,
} from "../utils/haptics";
import { validateUrl } from "../utils/urlValidation";

export default function Index() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { addScan } = useScanHistory();

  const { scannedUrl } = useLocalSearchParams<{
    scannedUrl?: string;
  }>();

  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const shouldScrollToResultRef = useRef(false);

  useEffect(() => {
    if (typeof scannedUrl !== "string") {
      return;
    }

    const validation = validateUrl(scannedUrl);

    if (!validation.isValid) {
      setUrl("");
      setError(`QR bağlantısı kullanılamadı: ${validation.error}`);
      setResult(null);
      triggerWarningHaptic();
      return;
    }

    setUrl(validation.cleanedUrl);
    setError("");
    setResult(null);
    triggerSuccessHaptic();
  }, [scannedUrl]);

  const handleUrlChange = (text: string) => {
    setUrl(text);
    setError("");
    setResult(null);
  };

  const handlePaste = async () => {
    if (isLoading) {
      return;
    }

    try {
      const clipboardText = await Clipboard.getStringAsync();

      if (!clipboardText.trim()) {
        setError("Panoda yapıştırılabilecek bir bağlantı bulunamadı.");
        setResult(null);
        triggerWarningHaptic();
        return;
      }

      const validation = validateUrl(clipboardText);

      if (!validation.isValid) {
        setError(`Panodaki içerik kullanılamadı: ${validation.error}`);
        setResult(null);
        triggerWarningHaptic();
        return;
      }

      setUrl(validation.cleanedUrl);
      setError("");
      setResult(null);
      triggerSelectionHaptic();
    } catch {
      setError("Panodaki bağlantı alınamadı. Lütfen tekrar deneyin.");
      setResult(null);
      triggerErrorHaptic();
    }
  };

  const handleQrPress = () => {
    triggerSelectionHaptic();
    router.push("/qr-scanner");
  };

  const handleGuidePress = () => {
    triggerSelectionHaptic();
    router.push("/guide");
  };

  const handleAccountPress = () => {
    triggerSelectionHaptic();

    if (isAuthenticated) {
      router.push("/profile");
      return;
    }

    router.push("/login");
  };

  const handleResultLayout = (event: LayoutChangeEvent) => {
    if (!shouldScrollToResultRef.current) {
      return;
    }

    shouldScrollToResultRef.current = false;

    scrollViewRef.current?.scrollTo({
      y: Math.max(event.nativeEvent.layout.y - 12, 0),
      animated: true,
    });
  };

  const handleScan = async () => {
    if (isLoading) {
      return;
    }

    Keyboard.dismiss();

    const validation = validateUrl(url);

    if (!validation.isValid) {
      setError(validation.error);
      setResult(null);
      triggerWarningHaptic();
      return;
    }

    const cleanedUrl = validation.cleanedUrl;

    setError("");
    setResult(null);
    setIsLoading(true);

    try {
      const scanResult = await scanUrl(cleanedUrl);

      shouldScrollToResultRef.current = true;
      setResult(scanResult);
      addScan(cleanedUrl, scanResult);

      if (scanResult.verdict === "safe") {
        triggerSuccessHaptic();
      } else {
        triggerWarningHaptic();
      }
    } catch (error) {
      const errorMessage =
        error instanceof UserFacingError
          ? error.message
          : "Tarama sırasında bir sorun oluştu. Lütfen tekrar deneyin.";

      setError(errorMessage);
      setResult(null);
      triggerErrorHaptic();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          onScrollBeginDrag={() => Keyboard.dismiss()}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <HomeHeader
              isAuthenticated={isAuthenticated}
              onAccountPress={handleAccountPress}
            />

            <ScanCard
              url={url}
              error={error}
              isLoading={isLoading}
              onUrlChange={handleUrlChange}
              onPaste={handlePaste}
              onQrPress={handleQrPress}
              onScan={handleScan}
            />

            {result ? (
              <View onLayout={handleResultLayout}>
                <ScanResultCard result={result} />
              </View>
            ) : null}

            <SecurityNote />

            <GuideShortcutCard onPress={handleGuidePress} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  flex: {
    flex: 1,
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
});
