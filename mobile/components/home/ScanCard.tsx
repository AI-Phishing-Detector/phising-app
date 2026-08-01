import Ionicons from "@expo/vector-icons/Ionicons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { colors } from "../../constants/theme";
import { MAX_URL_LENGTH } from "../../utils/urlValidation";

type ScanCardProps = {
  url: string;
  error: string;
  isLoading: boolean;
  onUrlChange: (text: string) => void;
  onPaste: () => void;
  onQrPress: () => void;
  onScan: () => void;
};

export function ScanCard({
  url,
  error,
  isLoading,
  onUrlChange,
  onPaste,
  onQrPress,
  onScan,
}: ScanCardProps) {
  const { width, fontScale } = useWindowDimensions();

  const shouldStackQuickActions = width < 370 || fontScale > 1.15;

  return (
    <View style={styles.scanCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Ionicons
            name="shield-checkmark-outline"
            size={23}
            color={colors.surface}
          />
        </View>

        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>URL Analizi</Text>

          <Text style={styles.cardDescription}>
            Kontrol etmek istediğin bağlantıyı gir.
          </Text>
        </View>
      </View>

      <Text style={styles.inputLabel}>Taranacak bağlantı</Text>

      <View style={styles.inputWrapper}>
        <TextInput
          accessibilityLabel="Taranacak bağlantı"
          accessibilityHint="Kontrol etmek istediğiniz internet bağlantısını yazın"
          style={styles.input}
          value={url}
          maxLength={MAX_URL_LENGTH}
          onChangeText={onUrlChange}
          onSubmitEditing={onScan}
          editable={!isLoading}
          placeholder="https://example.com/login"
          placeholderTextColor="#a3a3a3"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
        />

        {url.length > 0 && !isLoading ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bağlantıyı temizle"
            hitSlop={8}
            onPress={() => onUrlChange("")}
            style={({ pressed }) => [
              styles.clearButton,
              pressed && styles.clearButtonPressed,
            ]}
          >
            <Ionicons name="close" size={22} color={colors.textSoft} />
          </Pressable>
        ) : null}
      </View>

      <View
        style={[
          styles.quickActions,
          shouldStackQuickActions && styles.quickActionsStacked,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Panodaki bağlantıyı yapıştır"
          accessibilityState={{
            disabled: isLoading,
          }}
          disabled={isLoading}
          onPress={onPaste}
          style={({ pressed }) => [
            styles.quickActionButton,
            styles.quickActionLeft,
            shouldStackQuickActions && styles.quickActionButtonStacked,
            shouldStackQuickActions && styles.quickActionLeftStacked,
            pressed && styles.quickActionPressed,
            isLoading && styles.quickActionDisabled,
          ]}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="clipboard-outline" size={17} color={colors.text} />
          </View>

          <Text style={styles.quickActionText}>Panodan Yapıştır</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="QR kod tarayıcısını aç"
          accessibilityState={{
            disabled: isLoading,
          }}
          disabled={isLoading}
          onPress={onQrPress}
          style={({ pressed }) => [
            styles.quickActionButton,
            shouldStackQuickActions && styles.quickActionButtonStacked,
            pressed && styles.quickActionPressed,
            isLoading && styles.quickActionDisabled,
          ]}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="qr-code-outline" size={17} color={colors.text} />
          </View>

          <Text style={styles.quickActionText}>QR Tara</Text>
        </Pressable>
      </View>

      <View style={styles.feedbackArea}>
        {error ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error}
          </Text>
        ) : (
          <Text style={styles.helperText}>
            Bağlantı cihazınızda açılmadan analiz edilir.
          </Text>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isLoading ? "Bağlantı taranıyor" : "Bağlantıyı tara"
        }
        accessibilityState={{
          disabled: isLoading,
          busy: isLoading,
        }}
        disabled={isLoading}
        onPress={onScan}
        style={({ pressed }) => [
          styles.scanButton,
          pressed && !isLoading && styles.scanButtonPressed,
          isLoading && styles.scanButtonDisabled,
        ]}
      >
        {isLoading ? (
          <View style={styles.scanButtonContent}>
            <ActivityIndicator color={colors.surface} />

            <Text style={styles.scanButtonText}>Taranıyor...</Text>
          </View>
        ) : (
          <View style={styles.scanButtonContent}>
            <Ionicons name="scan-outline" size={20} color={colors.surface} />

            <Text style={styles.scanButtonText}>Bağlantıyı Tara</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scanCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderTopWidth: 6,
    borderTopColor: colors.text,
    borderRadius: 24,
    padding: 18,
    marginTop: 28,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },

  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  cardTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "700",
  },

  cardDescription: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },

  inputLabel: {
    color: colors.textStrong,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 9,
  },

  inputWrapper: {
    position: "relative",
  },

  input: {
    minHeight: 58,
    color: colors.text,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingLeft: 15,
    paddingRight: 58,
    fontSize: 15,
  },

  clearButton: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.subtle,
  },

  clearButtonPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.95 }],
  },

  quickActions: {
    flexDirection: "row",
    marginTop: 12,
  },

  quickActionsStacked: {
    flexDirection: "column",
  },

  quickActionButton: {
    flex: 1,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    paddingHorizontal: 8,
  },

  quickActionButtonStacked: {
    flex: 0,
    width: "100%",
  },

  quickActionLeft: {
    marginRight: 10,
  },

  quickActionLeftStacked: {
    marginRight: 0,
    marginBottom: 10,
  },

  quickActionPressed: {
    backgroundColor: colors.subtle,
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },

  quickActionDisabled: {
    opacity: 0.55,
  },

  quickActionIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#f1f1f1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },

  quickActionText: {
    flexShrink: 1,
    color: colors.textStrong,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },

  feedbackArea: {
    minHeight: 45,
    justifyContent: "center",
  },

  helperText: {
    color: colors.textMuted,
    fontSize: 12,
  },

  errorText: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
  },

  scanButton: {
    minHeight: 57,
    backgroundColor: colors.text,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  scanButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },

  scanButtonDisabled: {
    opacity: 0.55,
  },

  scanButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  scanButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 9,
  },
});
