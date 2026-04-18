import '../global.css';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { useAuthStore } from '../stores/authStore';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineBanner } from '../components/OfflineBanner';
import { SplashScreen } from '../components/SplashScreen';
import { registerUnauthorizedHandler } from '../lib/api';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { theme } from '../lib/theme';
import { useNotifications, useLastNotificationResponse } from '../hooks/useNotifications';


// ─── Auth Guard ───────────────────────────────────────────────────────────────

function AuthGuard() {
  const { user, loading } = useAuth();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const clearAuthStore = useAuthStore((s) => s.clearAuthStore);
  const segments = useSegments();
  const router = useRouter();

  // Register global 401 → auto-logout handler
  useEffect(() => {
    registerUnauthorizedHandler(async () => {
      await supabase.auth.signOut().catch(() => null);
      router.replace('/(auth)/login');
    });
  }, [router]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Not authenticated → go to login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Authenticated but still on auth screen → go to tabs
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  // Fetch user profile when user is available
  useEffect(() => {
    if (user) {
      fetchProfile(user.id);
    } else {
      clearAuthStore();
    }
  }, [user, fetchProfile, clearAuthStore]);

  // Register for push notifications after auth; handle cold-start tap.
  useNotifications(!!user && !loading);
  useLastNotificationResponse();

  if (loading) {
    return <SplashScreen />;
  }

  return null;
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Ahsing': require('../assets/fonts/ahsing.otf'),
  });

  if (!fontsLoaded) {
    return <SplashScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <AuthProvider>
            <StatusBar style="light" backgroundColor={colors.bg} />
            <AuthGuard />
            <OfflineBanner />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: 'slide_from_right',
                animationDuration: 250,
              }}
            >
              <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
              {/* Detail screens — slide from right */}
              <Stack.Screen
                name="call/[id]"
                options={{ headerShown: false, animation: 'slide_from_right', animationDuration: 250 }}
              />
              <Stack.Screen
                name="customer/[id]"
                options={{ headerShown: false, animation: 'slide_from_right', animationDuration: 250 }}
              />
              <Stack.Screen
                name="chat/[phone]"
                options={{ headerShown: false, animation: 'slide_from_right', animationDuration: 250 }}
              />
              <Stack.Screen
                name="contact/[phone]"
                options={{ headerShown: false, animation: 'slide_from_right', animationDuration: 250 }}
              />
              <Stack.Screen
                name="customers/new"
                options={{ headerShown: false, animation: 'slide_from_right', animationDuration: 250 }}
              />
              {/* Modal screens — slide from bottom */}
              <Stack.Screen
                name="billing"
                options={{
                  headerShown: false,
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                  animationDuration: 300,
                }}
              />
              <Stack.Screen
                name="profile"
                options={{
                  headerShown: false,
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                  animationDuration: 300,
                }}
              />
            </Stack>
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
