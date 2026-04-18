/**
 * notificationService.ts — Voicory Push Notification Infrastructure
 *
 * Handles:
 * - Expo push token registration
 * - Saving token to Supabase user_profiles
 * - Foreground notification display
 * - Notification response handling (deep links)
 *
 * NO secrets hardcoded. Token stored in Supabase only.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// ─── Foreground display behaviour ─────────────────────────────────────────────
// Show banner, play sound, and show badge while app is in foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationPreferences = {
  call_alerts: boolean;
  whatsapp_alerts: boolean;
  billing_alerts: boolean;
};

export type VoicoryNotificationData = {
  type?: 'call' | 'whatsapp' | 'billing' | 'general';
  callId?: string;
  phone?: string;
  customerId?: string;
};

// ─── Register and save push token ─────────────────────────────────────────────

/**
 * Requests permission, gets an Expo push token, and saves it to Supabase
 * user_profiles.push_token for the authenticated user.
 *
 * Returns the token string, or null if permissions denied / not a real device.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on real devices.
  if (!Device.isDevice) {
    if (__DEV__) console.log('[Notifications] Push notifications require a physical device.');
    return null;
  }

  // Android channel setup (must happen before requesting permission).
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Voicory Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00d4aa',
    });

    await Notifications.setNotificationChannelAsync('calls', {
      name: 'Call Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00d4aa',
    });

    await Notifications.setNotificationChannelAsync('whatsapp', {
      name: 'WhatsApp Alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
    });

    await Notifications.setNotificationChannelAsync('billing', {
      name: 'Billing Alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Request permission.
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    if (__DEV__) console.log('[Notifications] Permission denied.');
    return null;
  }

  // Get Expo push token.
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  });
  const token = tokenData.data;

  if (__DEV__) console.log('[Notifications] Expo push token:', token);

  // Save to Supabase.
  await savePushTokenToSupabase(token);

  return token;
}

/**
 * Saves the push token to user_profiles.push_token in Supabase.
 * Uses the currently authenticated Supabase user.
 */
export async function savePushTokenToSupabase(token: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (__DEV__) console.warn('[Notifications] No authenticated user; cannot save push token.');
      return;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ push_token: token })
      .eq('user_id', user.id);

    if (error) {
      // Column may not exist yet — log but don't crash.
      if (__DEV__) console.warn('[Notifications] Failed to save push token:', error.message);
    } else {
      if (__DEV__) console.log('[Notifications] Push token saved to Supabase.');
    }
  } catch (err) {
    if (__DEV__) console.error('[Notifications] Unexpected error saving push token:', err);
  }
}

/**
 * Clears the push token from Supabase when the user logs out,
 * so they don't receive notifications for stale sessions.
 */
export async function clearPushTokenFromSupabase(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_profiles')
      .update({ push_token: null })
      .eq('user_id', user.id);
  } catch (err) {
    if (__DEV__) console.error('[Notifications] Error clearing push token:', err);
  }
}

// ─── Notification preferences ─────────────────────────────────────────────────

/**
 * Loads notification preferences from user_profiles.
 * Returns defaults (all enabled) if not set.
 */
export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  const defaults: NotificationPreferences = {
    call_alerts: true,
    whatsapp_alerts: true,
    billing_alerts: true,
  };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return defaults;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('notification_call_alerts, notification_whatsapp_alerts, notification_billing_alerts')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return defaults;

    return {
      call_alerts: data.notification_call_alerts ?? true,
      whatsapp_alerts: data.notification_whatsapp_alerts ?? true,
      billing_alerts: data.notification_billing_alerts ?? true,
    };
  } catch {
    return defaults;
  }
}

/**
 * Saves notification preferences to user_profiles.
 */
export async function saveNotificationPreferences(
  prefs: NotificationPreferences,
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        notification_call_alerts: prefs.call_alerts,
        notification_whatsapp_alerts: prefs.whatsapp_alerts,
        notification_billing_alerts: prefs.billing_alerts,
      })
      .eq('user_id', user.id);

    if (error && __DEV__) {
      console.warn('[Notifications] Failed to save preferences:', error.message);
    }
  } catch (err) {
    if (__DEV__) console.error('[Notifications] Error saving preferences:', err);
  }
}

// ─── Low-balance local alert ──────────────────────────────────────────────────

/**
 * Schedules a local notification when credit balance is low or critical.
 * Idempotent: checks existing scheduled notifications to avoid spam.
 * Silently no-ops if permissions not granted.
 */
export async function scheduleLowBalanceAlert(health: {
  urgency: 'healthy' | 'watch' | 'low' | 'critical';
  balanceInr: number;
  daysRemaining: number;
}): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    // Cancel any previous low-balance alerts before scheduling new one
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existing = scheduled.filter(
      (n) => (n.content.data as any)?.type === 'billing' && (n.content.data as any)?.subtype === 'low_balance',
    );
    await Promise.all(existing.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));

    const isCritical = health.urgency === 'critical';
    const daysLabel = health.daysRemaining < 1 ? 'less than 1 day' : `~${Math.round(health.daysRemaining)} days`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: isCritical ? '⚡ Voicory Credits Critical' : '⚠️ Voicory Credits Low',
        body: isCritical
          ? `Your balance (₹${health.balanceInr.toFixed(0)}) will run out in ${daysLabel}. Top up now to keep your agents running.`
          : `Your credits (₹${health.balanceInr.toFixed(0)}) will last about ${daysLabel} at current usage.`,
        sound: true,
        data: { type: 'billing', subtype: 'low_balance', url: 'voicory://billing' },
        categoryIdentifier: 'billing',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
    });
  } catch (err) {
    if (__DEV__) console.warn('[Notifications] scheduleLowBalanceAlert failed:', err);
  }
}

// ─── Deep link resolution ──────────────────────────────────────────────────────

/**
 * Given notification data, returns the app route to navigate to.
 */
export function resolveNotificationRoute(
  data: VoicoryNotificationData,
): string | null {
  if (!data?.type) return null;

  switch (data.type) {
    case 'call':
      return data.callId ? `/call/${data.callId}` : '/(tabs)/calls';
    case 'whatsapp':
      return data.phone ? `/chat/${data.phone}` : '/(tabs)/whatsapp';
    case 'billing':
      return '/billing';
    default:
      return '/(tabs)';
  }
}
