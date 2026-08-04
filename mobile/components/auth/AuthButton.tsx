import { Ionicons } from "@expo/vector-icons";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { colors } from "../../constants/theme";
import { triggerSelectionHaptic } from "../../utils/haptics";

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
}

export function AuthButton({
  title,
  onPress,
  isLoading = false,
  disabled = false,
  iconName = "arrow-forward",
}: AuthButtonProps) {
  const isDisabled = disabled || isLoading;

  const handlePress = () => {
    if (isDisabled) {
      return;
    }

    triggerSelectionHaptic();
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{
        disabled: isDisabled,
        busy: isLoading,
      }}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        pressed && !isDisabled && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
      ]}
    >
      {isLoading ? (
        <View style={styles.content}>
          <ActivityIndicator size="small" color={colors.surface} />
          <Text style={styles.buttonText}>İşlem yapılıyor...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.buttonText}>{title}</Text>
          <Ionicons name={iconName} size={20} color={colors.surface} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.text,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  buttonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "700",
  },
});
