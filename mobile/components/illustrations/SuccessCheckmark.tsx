import React, { useEffect } from 'react';
import Svg, { Defs, LinearGradient, Stop, Circle, Path, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '../../lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  size?: number;
  autoPlay?: boolean;
}

export function SuccessCheckmark({ size = 120, autoPlay = true }: Props) {
  const ringProgress = useSharedValue(0);
  const checkProgress = useSharedValue(0);
  const scaleVal = useSharedValue(0.8);

  useEffect(() => {
    if (autoPlay) {
      ringProgress.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
      checkProgress.value = withDelay(300, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }));
      scaleVal.value = withSequence(
        withDelay(200, withSpring(1.1, { damping: 10, stiffness: 200 })),
        withSpring(1, { damping: 12, stiffness: 180 })
      );
    } else {
      ringProgress.value = 1;
      checkProgress.value = 1;
      scaleVal.value = 1;
    }
  }, [autoPlay]);

  const ringProps = useAnimatedProps(() => ({
    opacity: ringProgress.value,
    r: interpolate(ringProgress.value, [0, 1], [20, 44]),
  }));

  const glowProps = useAnimatedProps(() => ({
    opacity: ringProgress.value * 0.2,
    r: interpolate(ringProgress.value, [0, 1], [20, 52]),
  }));

  const checkProps = useAnimatedProps(() => ({
    opacity: checkProgress.value,
  }));

  const outerRingProps = useAnimatedProps(() => ({
    opacity: ringProgress.value * 0.15,
    r: interpolate(ringProgress.value, [0, 1], [20, 60]),
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Defs>
        <LinearGradient id="sc_ring" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.secondary} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="sc_check" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.primaryDark} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Outer glow ring */}
      <AnimatedCircle cx="60" cy="60" stroke={colors.primary} strokeWidth="1" fill="none" animatedProps={outerRingProps} />

      {/* Glow fill */}
      <AnimatedCircle cx="60" cy="60" fill={colors.primary} animatedProps={glowProps} />

      {/* Main circle */}
      <AnimatedCircle cx="60" cy="60" fill="url(#sc_ring)" animatedProps={ringProps} />

      {/* Checkmark */}
      <AnimatedPath
        d="M44 60 L55 72 L76 48"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        animatedProps={checkProps}
      />
    </Svg>
  );
}
