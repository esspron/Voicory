import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors as C } from '../lib/theme';

// ═══════════════════════════════════════════════════════════════════════════════
// ProgressRing — animated SVG circular progress indicator
// Props:
//   value      — 0–100 percentage
//   size       — diameter in px (default 64)
//   strokeWidth — ring thickness (default 5)
//   color      — ring color (default primary)
//   trackColor — background track color
//   label      — center label (defaults to "value%")
//   labelStyle — text style override
//   style      — container style override
//   animate    — whether to animate on mount (default true)
// ═══════════════════════════════════════════════════════════════════════════════

interface ProgressRingProps {
  value: number;          // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  labelStyle?: object;
  subLabel?: string;
  style?: ViewStyle;
  animate?: boolean;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 5,
  color,
  trackColor,
  label,
  labelStyle,
  subLabel,
  style,
  animate = true,
}: ProgressRingProps) {
  const c = color ?? C.primary;
  const tc = trackColor ?? C.border;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clampedVal = Math.min(Math.max(value, 0), 100);

  // Animate stroke-dashoffset via Animated.Value
  const animVal = useRef(new Animated.Value(animate ? 0 : clampedVal)).current;

  useEffect(() => {
    if (animate) {
      Animated.timing(animVal, {
        toValue: clampedVal,
        duration: 1000,
        delay: 200,
        useNativeDriver: false,
      }).start();
    } else {
      animVal.setValue(clampedVal);
    }
  }, [clampedVal, animate]);

  const strokeDashoffset = animVal.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const displayLabel = label ?? `${Math.round(clampedVal)}%`;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={StyleSheet.absoluteFill}
      >
        {/* Track circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tc}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc — animated */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={c}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset as any}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.centerLabel}>
        <Text style={[styles.label, { color: c, fontSize: size * 0.22 }, labelStyle]}>
          {displayLabel}
        </Text>
        {subLabel ? (
          <Text style={[styles.subLabel, { fontSize: size * 0.13 }]}>{subLabel}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '800',
    lineHeight: undefined,
  },
  subLabel: {
    color: C.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 1,
  },
});
