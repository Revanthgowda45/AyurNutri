import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const NOTIF_PROMPT_KEY = 'ayurnutri_notif_prompted';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}

/**
 * Schedule a local notification (e.g. for meal or water reminders)
 */
export async function scheduleLocalNotification(title: string, body: string, trigger: Notifications.NotificationTriggerInput) {
  if (Platform.OS === 'web') return;
  
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger,
  });
}

/**
 * Cancel all scheduled local notifications
 */
export async function cancelAllScheduledNotifications() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Schedule the standard AyurNutri daily reminders
 * (Breakfast, Lunch, Dinner, and Water)
 */
export async function scheduleDailyAyurvedicReminders() {
  if (Platform.OS === 'web') return;
  
  // First, clear any existing ones so we don't duplicate
  await cancelAllScheduledNotifications();

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  // 1. Morning Water (7:00 AM)
  await Notifications.scheduleNotificationAsync({
    content: { title: "💧 Hydration Time", body: "Start your day with a warm glass of water!" },
    trigger: { hour: 7, minute: 0, repeats: true },
  });

  // 2. Breakfast (8:30 AM)
  await Notifications.scheduleNotificationAsync({
    content: { title: "🥞 Breakfast Time", body: "Time for a healthy, balancing breakfast!" },
    trigger: { hour: 8, minute: 30, repeats: true },
  });

  // 3. Lunch - Largest Meal (1:00 PM - High Pitta time)
  await Notifications.scheduleNotificationAsync({
    content: { title: "🍲 Lunch Time", body: "Your digestive fire is highest now. Enjoy a hearty lunch!" },
    trigger: { hour: 13, minute: 0, repeats: true },
  });

  // 4. Dinner - Light Meal (7:30 PM)
  await Notifications.scheduleNotificationAsync({
    content: { title: "🥗 Dinner Time", body: "Time for a light, easily digestible dinner before bed." },
    trigger: { hour: 19, minute: 30, repeats: true },
  });
}

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
 */
export async function openAppNotificationSettings(): Promise<void> {
  if (Platform.OS === 'web') return;
  Linking.openSettings();
}
