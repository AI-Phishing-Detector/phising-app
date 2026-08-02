import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "../../constants/theme";

interface AuthScreenLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthScreenLayout({
  title,
  description,
  children,
  footer,
}: AuthScreenLayoutProps) {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
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

            <View style={styles.card}>
              <Text style={styles.title}>{title}</Text>

              <Text style={styles.description}>{description}</Text>

              <View style={styles.form}>{children}</View>

              {footer ? <View style={styles.footer}>{footer}</View> : null}
            </View>

            <Text style={styles.securityNote}>
              Hesap bilgilerinizi yalnızca güvendiğiniz cihazlarda kullanın.
            </Text>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  content: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 34,
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
  },
  headerIdentity: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  headerLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 3,
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
  card: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 28,
    backgroundColor: colors.surface,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  description: {
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  form: {
    marginTop: 26,
  },
  footer: {
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  securityNote: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 24,
    paddingHorizontal: 20,
  },
});
