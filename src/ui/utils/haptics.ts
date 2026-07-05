import * as Haptics from 'expo-haptics';

/**
 * Thin, never-throwing wrapper over expo-haptics. Haptics are a progressive
 * enhancement — a device without a taptic engine (or the web build) must never
 * crash, so every call swallows its own errors.
 */
async function safe(run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch {
    // Haptics unavailable on this device/platform — ignore.
  }
}

export const haptics = {
  success: (): Promise<void> =>
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: (): Promise<void> =>
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: (): Promise<void> =>
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  selection: (): Promise<void> => safe(() => Haptics.selectionAsync()),
} as const;
