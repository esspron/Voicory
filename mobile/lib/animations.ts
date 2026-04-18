/**
 * animations.ts — Voicory Reusable Animation Presets
 * Uses React Native Animated API only (no reanimated dependency)
 */

import { Animated, Easing } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnimatedValues {
  opacity: Animated.Value;
  translateY: Animated.Value;
  translateX: Animated.Value;
  scale: Animated.Value;
}

// ─── Factory: create a fresh set of animated values ──────────────────────────

export function createAnimatedValues(opts?: {
  opacity?: number;
  translateY?: number;
  translateX?: number;
  scale?: number;
}): AnimatedValues {
  return {
    opacity: new Animated.Value(opts?.opacity ?? 0),
    translateY: new Animated.Value(opts?.translateY ?? 0),
    translateX: new Animated.Value(opts?.translateX ?? 0),
    scale: new Animated.Value(opts?.scale ?? 1),
  };
}

// ─── fadeInUp ─────────────────────────────────────────────────────────────────
// Element fades in and slides up — ideal for list items / cards on mount

export function fadeInUp(
  values: Pick<AnimatedValues, 'opacity' | 'translateY'>,
  opts?: { delay?: number; duration?: number; distance?: number }
): Animated.CompositeAnimation {
  const { delay = 0, duration = 280, distance = 18 } = opts ?? {};

  values.opacity.setValue(0);
  values.translateY.setValue(distance);

  return Animated.parallel([
    Animated.timing(values.opacity, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
    Animated.timing(values.translateY, {
      toValue: 0,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
  ]);
}

// ─── slideInRight ─────────────────────────────────────────────────────────────
// For screen or panel transitions sliding in from the right

export function slideInRight(
  values: Pick<AnimatedValues, 'opacity' | 'translateX'>,
  opts?: { delay?: number; duration?: number; distance?: number }
): Animated.CompositeAnimation {
  const { delay = 0, duration = 320, distance = 60 } = opts ?? {};

  values.opacity.setValue(0);
  values.translateX.setValue(distance);

  return Animated.parallel([
    Animated.timing(values.opacity, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
    Animated.timing(values.translateX, {
      toValue: 0,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
  ]);
}

// ─── pulseGlow ────────────────────────────────────────────────────────────────
// Subtle repeating pulse for notification dots / active indicators

export function pulseGlow(
  scaleValue: Animated.Value,
  opts?: { minScale?: number; maxScale?: number; duration?: number }
): Animated.CompositeAnimation {
  const { minScale = 0.88, maxScale = 1.12, duration = 900 } = opts ?? {};

  return Animated.loop(
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: maxScale,
        duration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: minScale,
        duration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ])
  );
}

// ─── shimmer ─────────────────────────────────────────────────────────────────
// Loading shimmer — animates translateX from -1 to 1 (relative offset for use
// with interpolation in a shimmer component)

export function shimmer(
  positionValue: Animated.Value,
  opts?: { duration?: number }
): Animated.CompositeAnimation {
  const { duration = 1100 } = opts ?? {};

  return Animated.loop(
    Animated.sequence([
      Animated.timing(positionValue, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(positionValue, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ])
  );
}

// ─── scalePress — handlers for PressableScale ────────────────────────────────

export const SCALE_PRESS_DOWN = 0.97;

export function pressIn(scaleValue: Animated.Value): void {
  Animated.spring(scaleValue, {
    toValue: SCALE_PRESS_DOWN,
    damping: 15,
    stiffness: 300,
    useNativeDriver: true,
  }).start();
}

export function pressOut(scaleValue: Animated.Value): void {
  Animated.spring(scaleValue, {
    toValue: 1,
    damping: 12,
    stiffness: 200,
    useNativeDriver: true,
  }).start();
}

// ─── Stagger helper ──────────────────────────────────────────────────────────
// Run an array of animations with incrementing delays

export function stagger(
  animations: Animated.CompositeAnimation[],
  staggerMs = 60
): Animated.CompositeAnimation {
  return Animated.stagger(staggerMs, animations);
}

// ─── Tab bounce ──────────────────────────────────────────────────────────────
// Bounce animation for tab bar icons on selection

export function tabBounce(scaleValue: Animated.Value): void {
  Animated.sequence([
    Animated.timing(scaleValue, {
      toValue: 0.82,
      duration: 80,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }),
    Animated.spring(scaleValue, {
      toValue: 1,
      damping: 8,
      stiffness: 280,
      useNativeDriver: true,
    }),
  ]).start();
}
