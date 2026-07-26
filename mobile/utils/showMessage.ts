import { Alert, Platform } from "react-native";

interface ShowMessageOptions {
  title: string;
  message: string;
  buttonText?: string;
  onConfirm?: () => void;
}

export function showMessage({
  title,
  message,
  buttonText = "Tamam",
  onConfirm,
}: ShowMessageOptions) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(`${title}\n\n${message}`);
    }

    onConfirm?.();
    return;
  }

  Alert.alert(title, message, [
    {
      text: buttonText,
      onPress: onConfirm,
    },
  ]);
}
