import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AuthButton } from "../components/auth/AuthButton";
import { AuthInput } from "../components/auth/AuthInput";
import { AuthScreenLayout } from "../components/auth/AuthScreenLayout";
import { colors } from "../constants/theme";
import { forgotPassword } from "../services/authService";
import { triggerErrorHaptic, triggerSuccessHaptic } from "../utils/haptics";
import { showMessage } from "../utils/showMessage";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setEmailError("E-posta adresinizi yazın.");
      return false;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setEmailError("Geçerli bir e-posta adresi yazın.");
      return false;
    }

    return true;
  };

  const handleForgotPassword = async () => {
    if (isLoading) {
      return;
    }

    setEmailError("");
    setGeneralError("");

    if (!validateEmail()) {
      triggerErrorHaptic();
      return;
    }

    setIsLoading(true);

    try {
      const response = await forgotPassword({
        email: email.trim().toLowerCase(),
      });

      triggerSuccessHaptic();

      showMessage({
        title: "Şifre sıfırlama işlemi tamamlandı",
        message: response.message,
        buttonText: "Giriş ekranına dön",
        onConfirm: () => router.replace("/login"),
      });
    } catch (error) {
      triggerErrorHaptic();

      setGeneralError(
        error instanceof Error
          ? error.message
          : "Şifre sıfırlanırken beklenmeyen bir sorun oluştu.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      title="Şifremi Unuttum"
      description="Hesabınıza ait e-posta adresini yazın ve şifre sıfırlama işlemini başlatın."
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Şifrenizi hatırladınız mı?</Text>

          <Pressable
            accessibilityRole="link"
            onPress={() => router.replace("/login")}
            style={({ pressed }) => pressed && styles.linkPressed}
          >
            <Text style={styles.footerLink}>Giriş yap</Text>
          </Pressable>
        </View>
      }
    >
      {generalError ? (
        <View accessibilityRole="alert" style={styles.errorCard}>
          <Ionicons
            name="alert-circle-outline"
            size={21}
            color={colors.danger}
          />

          <Text style={styles.errorText}>{generalError}</Text>
        </View>
      ) : null}

      <AuthInput
        label="E-posta"
        value={email}
        errorMessage={emailError}
        placeholder="ornek@gmail.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        editable={!isLoading}
        returnKeyType="done"
        onSubmitEditing={() => {
          void handleForgotPassword();
        }}
        onChangeText={(value) => {
          setEmail(value);
          setEmailError("");
          setGeneralError("");
        }}
      />

      <AuthButton
        title="Şifreyi Sıfırla"
        iconName="mail-outline"
        isLoading={isLoading}
        onPress={() => {
          void handleForgotPassword();
        }}
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 14,
    backgroundColor: "#fef2f2",
    padding: 13,
    marginBottom: 18,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 5,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  footerLink: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  linkPressed: {
    opacity: 0.5,
  },
});
