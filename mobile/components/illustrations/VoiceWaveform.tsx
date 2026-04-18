import React, { useEffect } from 'react';
import Svg, { Defs, LinearGradient, Stop, Path, Rect, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '../../lib/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  size?: number;
  animated?: boolean;
}

function WaveLine({ d, opacity, delay, animated }: { d: string; opacity: number; delay: number; animated: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      progress.value = withRepeat(
        withTiming(1, { duration: 1800 + delay * 300, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    }
  }, [animated]);

  const animatedProps = useAnimatedProps(() => ({
    opacity: animated ? interpolate(progress.value, [0, 1], [opacity * 0.5, opacity]) : opacity,
  }));

  return (
    <AnimatedPath
      d={d}
      stroke={`url(#wv_grad)`}
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
      animatedProps={animatedProps}
    />
  );
}

export function VoiceWaveform({ size = 200, animated = true }: Props) {
  const w = size;
  const h = size * 0.6;
  const cx = w / 2;
  const cy = h / 2;

  // Generate wave paths
  const waves = [
    { d: `M${cx - 80} ${cy} Q${cx - 60} ${cy - 40} ${cx - 40} ${cy} Q${cx - 20} ${cy + 40} ${cx} ${cy} Q${cx + 20} ${cy - 40} ${cx + 40} ${cy} Q${cx + 60} ${cy + 40} ${cx + 80} ${cy}`, opacity: 0.9, delay: 0 },
    { d: `M${cx - 70} ${cy} Q${cx - 50} ${cy - 28} ${cx - 30} ${cy} Q${cx - 10} ${cy + 28} ${cx + 10} ${cy} Q${cx + 30} ${cy - 28} ${cx + 50} ${cy} Q${cx + 60} ${cy + 14} ${cx + 70} ${cy}`, opacity: 0.6, delay: 1 },
    { d: `M${cx - 55} ${cy} Q${cx - 35} ${cy - 18} ${cx - 15} ${cy} Q${cx + 5} ${cy + 18} ${cx + 25} ${cy} Q${cx + 40} ${cy - 18} ${cx + 55} ${cy}`, opacity: 0.4, delay: 2 },
  ];

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <Defs>
        <LinearGradient id="wv_grad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="0" />
          <Stop offset="0.3" stopColor={colors.primary} stopOpacity="1" />
          <Stop offset="0.7" stopColor={colors.secondary} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.secondary} stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="wv_bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.primaryMuted} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.bg} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {/* Background glow blob */}
      <Rect x={cx - 90} y={cy - 50} width="180" height="100" rx="50" fill="url(#wv_bg)" opacity="0.4" />
      {waves.map((wave, i) => (
        <WaveLine key={i} d={wave.d} opacity={wave.opacity} delay={wave.delay} animated={animated} />
      ))}
    </Svg>
  );
}
