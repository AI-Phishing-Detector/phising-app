import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    type TextInputProps,
    View,
} from "react-native";

import { colors } from "../../constants/theme";

interface AuthInputProps extends Omit<
  TextInputProps,
  "style" | "secureTextEntry"
> {
  label: string;
  errorMessage?: string;
  isPassword?: boolean;
}

export function AuthInput({
  label,
  errorMessage,
  isPassword = false,
  ...textInputProps
}: AuthInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.inputContainer,
          errorMessage ? styles.inputContainerError : null,
        ]}
      >
        <TextInput
          {...textInputProps}
          style={styles.input}
          placeholderTextColor="#a3a3a3"
          secureTextEntry={isPassword && !isPasswordVisible}
        />

        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isPasswordVisible ? "Şifreyi gizle" : "Şifreyi göster"
            }
            hitSlop={10}
            onPress={() => setIsPasswordVisible((current) => !current)}
            style={({ pressed }) => [
              styles.visibilityButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
              size={21}
              color={colors.textSoft}
            />
          </Pressable>
        ) : null}
      </View>

      {errorMessage ? (
        <View style={styles.errorRow}>
          <Ionicons
            name="alert-circle-outline"
            size={15}
            color={colors.danger}
          />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 18,
  },
  label: {
    color: colors.textStrong,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputContainer: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  inputContainerError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 14,
  },
  visibilityButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  buttonPressed: {
    opacity: 0.5,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
    gap: 5,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
  },
});
