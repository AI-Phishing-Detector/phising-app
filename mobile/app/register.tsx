import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AuthButton } from "../components/auth/AuthButton";
import { AuthInput } from "../components/auth/AuthInput";
import { AuthScreenLayout } from "../components/auth/AuthScreenLayout";
import { colors } from "../constants/theme";
import { registerUser } from "../services/authService";
import { triggerErrorHaptic, triggerSuccessHaptic } from "../utils/haptics";
import { showMessage } from "../utils/showMessage";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [fullNameError, setFullNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmationError, setConfirmationError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const clearErrors = () => {
    setFullNameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmationError("");
    setGeneralError("");
  };

  const validateForm = () => {
    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    let isValid = true;

    if (normalizedName.length < 3) {
      setFullNameError("Adınızı ve soyadınızı yazın.");
      isValid = false;
    }

    if (!normalizedEmail) {
      setEmailError("E-posta adresinizi yazın.");
      isValid = false;
    } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setEmailError("Geçerli bir e-posta adresi yazın.");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Bir şifre belirleyin.");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Şifre en az 6 karakter olmalıdır.");
      isValid = false;
    }

    if (!passwordConfirmation) {
      setConfirmationError("Şifrenizi tekrar yazın.");
      isValid = false;
    } else if (passwordConfirmation !== password) {
      setConfirmationError("Yazdığınız şifreler eşleşmiyor.");
      isValid = false;
    }

    return isValid;
  };

  const handleRegister = async () => {
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
      const response = await registerUser({
        ad_soyad: fullName.trim(),
        email: email.trim().toLowerCase(),
        sifre: password,
      });

      triggerSuccessHaptic();

      showMessage({
        title: "Kayıt başarılı",
        message: response.message,
        buttonText: "Giriş yap",
        onConfirm: () => router.replace("/login"),
      });
    } catch (error) {
      triggerErrorHaptic();

      setGeneralError(
        error instanceof Error
          ? error.message
          : "Kayıt sırasında beklenmeyen bir sorun oluştu.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      title="Kayıt Ol"
      description="Hesap oluşturarak tarama geçmişinizi ve profil bilgilerinizi yönetin."
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Zaten hesabınız var mı?</Text>

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
        label="Ad Soyad"
        value={fullName}
        errorMessage={fullNameError}
        placeholder="Adınız Soyadınız"
        autoCapitalize="words"
        autoCorrect={false}
        autoComplete="name"
        textContentType="name"
        editable={!isLoading}
        onChangeText={(value) => {
          setFullName(value);
          setFullNameError("");
          setGeneralError("");
        }}
      />

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
        placeholder="En az 6 karakter"
        isPassword
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!isLoading}
        onChangeText={(value) => {
          setPassword(value);
          setPasswordError("");
          setConfirmationError("");
          setGeneralError("");
        }}
      />

      <AuthInput
        label="Şifreyi Onaylayın"
        value={passwordConfirmation}
        errorMessage={confirmationError}
        placeholder="Şifrenizi tekrar yazın"
        isPassword
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!isLoading}
        returnKeyType="done"
        onSubmitEditing={() => {
          void handleRegister();
        }}
        onChangeText={(value) => {
          setPasswordConfirmation(value);
          setConfirmationError("");
          setGeneralError("");
        }}
      />

      <AuthButton
        title="Kayıt Ol"
        iconName="person-add-outline"
        isLoading={isLoading}
        onPress={() => {
          void handleRegister();
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
