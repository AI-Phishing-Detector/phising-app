import * as Haptics from "expo-haptics";

function safelyRunHaptic(action: () => Promise<void>) {
  void action().catch(() => undefined);
}

export function triggerSelectionHaptic() {
  safelyRunHaptic(() => Haptics.selectionAsync());
}

export function triggerSuccessHaptic() {
  safelyRunHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  );
}

export function triggerWarningHaptic() {
  safelyRunHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  );
}

export function triggerErrorHaptic() {
  safelyRunHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  );
}
