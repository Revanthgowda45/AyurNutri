import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_PROMPT_KEY = 'ayurnutri_notif_prompted';

/**
 * Check if we've already asked the user for notifications
 */
export async function hasPromptedForNotifications(): Promise<boolean> {
  const value = await AsyncStorage.getItem(NOTIF_PROMPT_KEY);
  return value === 'true';
}

/**
 * Mark that we've prompted the user
 */
export async function markPromptedForNotifications(): Promise<void> {
  await AsyncStorage.setItem(NOTIF_PROMPT_KEY, 'true');
}

/**
 * Opens the app's settings page in the phone's main Settings app.
 * The user can enable/disable all notification types from there.
 */
export async function openAppNotificationSettings(): Promise<void> {
  if (Platform.OS === 'web') return;
  Linking.openSettings();
}
