/**
 * components/OfflineBanner.tsx
 *
 * Slide-down banner that appears when the device is offline.
 * Import and render in the root layout so it overlays every screen.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii } from '../lib/theme';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const BANNER_HEIGHT = 40;

export function OfflineBanner() {
  const { isOnline, isChecking } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-BANNER_HEIGHT)).current;

  const visible = !isChecking && !isOnline;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : -BANNER_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <View style={styles.gradient}>
        {/* Left accent line */}
        <View style={styles.accent} />
        <Text style={styles.icon}>📶</Text>
        <Text style={styles.label}>No internet connection</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    height: BANNER_HEIGHT,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  icon: {
    fontSize: 14,
  },
  label: {
    ...typography.captionSm,
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
