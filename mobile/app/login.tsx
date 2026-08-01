import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AuthButton } from "../components/auth/AuthButton";
import { AuthInput } from "../components/auth/AuthInput";
import { AuthScreenLayout } from "../components/auth/AuthScreenLayout";
import { colors } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { loginUser } from "../services/authService";
import { triggerErrorHaptic, triggerSuccessHaptic } from "../utils/haptics";
import { showMessage } from "../utils/showMessage";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const clearErrors = () => {
    setEmailError("");
    setPasswordError("");
    setGeneralError("");
  };

  const validateForm = () => {
    const normalizedEmail = email.trim().toLowerCase();
    let isValid = true;

    if (!normalizedEmail) {
      setEmailError("E-posta adresinizi yazın.");
      isValid = false;
    } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setEmailError("Geçerli bir e-posta adresi yazın.");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Şifrenizi yazın.");
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (isLoading) {
      return;
    }

    clearErrors();

    if (!validateForm()) {
      triggerErrorHaptic();
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const response = await loginUser({
        email: normalizedEmail,
        sifre: password,
      });

      signIn({
        name: response.ad_soyad,
        email: normalizedEmail,
      });

      triggerSuccessHaptic();

      showMessage({
        title: "Giriş başarılı",
        message: `Hoş geldin ${response.ad_soyad}.`,
        buttonText: "Ana ekrana dön",
        onConfirm: () => router.replace("/"),
      });
    } catch (error) {
      triggerErrorHaptic();

      setGeneralError(
        error instanceof Error
          ? error.message
          : "Giriş yapılırken beklenmeyen bir sorun oluştu.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      title="Giriş Yap"
      description="Hesabınıza giriş yaparak tarama geçmişinize ve profil bilgilerinize ulaşın."
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Hesabınız yok mu?</Text>

          <Pressable
            accessibilityRole="link"
            onPress={() => router.push("/register")}
            style={({ pressed }) => pressed && styles.linkPressed}
          >
            <Text style={styles.footerLink}>Kayıt ol</Text>
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
        onChangeText={(value) => {
          setEmail(value);
          setEmailError("");
          setGeneralError("");
        }}
      />

      <AuthInput
        label="Şifre"
        value={password}
        errorMessage={passwordError}
        placeholder="Şifrenizi yazın"
        isPassword
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        editable={!isLoading}
        returnKeyType="done"
        onSubmitEditing={() => {
          void handleLogin();
        }}
        onChangeText={(value) => {
          setPassword(value);
          setPasswordError("");
          setGeneralError("");
        }}
      />

      <Pressable
        accessibilityRole="link"
        onPress={() => router.push("/forgot-password")}
        style={({ pressed }) => [
          styles.forgotPasswordButton,
          pressed && styles.linkPressed,
        ]}
      >
        <Text style={styles.forgotPasswordText}>Şifremi unuttum</Text>
      </Pressable>

      <AuthButton
        title="Giriş Yap"
        iconName="log-in-outline"
        isLoading={isLoading}
        onPress={() => {
          void handleLogin();
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
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginTop: -5,
    marginBottom: 20,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    color: colors.textStrong,
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
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
