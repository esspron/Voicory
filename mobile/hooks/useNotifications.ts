/**
 * useNotifications.ts — Push Notification Hook
 *
 * Registers for push notifications after auth, listens for incoming
 * notifications, and handles tap → deep link navigation.
 *
 * Usage: call useNotifications() once in a screen that is shown after auth
 * (e.g. AuthGuard inside _layout.tsx).
 */

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
  registerForPushNotifications,
  resolveNotificationRoute,
  VoicoryNotificationData,
} from '../services/notificationService';

export function useNotifications(isAuthenticated: boolean) {
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Register and save token when user is authenticated.
    registerForPushNotifications().catch((err) => {
      if (__DEV__) console.error('[useNotifications] Registration error:', err);
    });

    // Listen for notifications received while app is in foreground.
    // The setNotificationHandler in notificationService.ts already controls
    // how they are displayed; this is for in-app side-effects (e.g. badge refresh).
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (__DEV__) {
          console.log('[useNotifications] Notification received:', notification.request.content);
        }
        // Extend here: update badge count, refresh data, etc.
      },
    );

    // Listen for user tapping a notification.
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as VoicoryNotificationData;
        const route = resolveNotificationRoute(data);
        if (route) {
          // Small delay to ensure navigation stack is ready.
          setTimeout(() => {
            router.push(route as any);
          }, 300);
        }
      },
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated, router]);
}

/**
 * useLastNotificationResponse — handles cold-start deep links.
 *
 * If the app was launched by tapping a notification (app was closed),
 * this navigates to the correct screen on mount.
 */
export function useLastNotificationResponse() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      handled.current = true;

      const data = response.notification.request.content.data as VoicoryNotificationData;
      const route = resolveNotificationRoute(data);
      if (route) {
        setTimeout(() => {
          router.push(route as any);
        }, 500);
      }
    });
  }, [router]);
}
