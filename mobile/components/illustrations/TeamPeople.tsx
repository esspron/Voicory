import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Circle, Ellipse, G } from 'react-native-svg';
import { colors } from '../../lib/theme';

interface Props {
  size?: number;
}

export function TeamPeople({ size = 220 }: Props) {
  const w = size;
  const h = size * 0.75;

  // A person shape helper: circle head + rounded rect body
  function Person({
    cx, cy, scale = 1, gradId, opacity = 1,
  }: {
    cx: number; cy: number; scale?: number; gradId: string; opacity?: number;
  }) {
    const headR = 14 * scale;
    const bodyW = 32 * scale;
    const bodyH = 22 * scale;
    return (
      <G opacity={opacity}>
        <Circle cx={cx} cy={cy - headR * 0.5} r={headR} fill={`url(#${gradId})`} />
        <Rect
          x={cx - bodyW / 2}
          y={cy + headR * 0.5}
          width={bodyW}
          height={bodyH}
          rx={bodyW / 2}
          fill={`url(#${gradId})`}
          opacity="0.8"
        />
      </G>
    );
  }

  return (
    <Svg width={w} height={h} viewBox="0 0 220 165" fill="none">
      <Defs>
        <LinearGradient id="tp_p1" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.primaryDark} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="tp_p2" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.secondary} stopOpacity="1" />
          <Stop offset="1" stopColor="#0077cc" stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="tp_p3" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.warning} stopOpacity="1" />
          <Stop offset="1" stopColor="#d48000" stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="tp_p4" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.success} stopOpacity="1" />
          <Stop offset="1" stopColor="#18a349" stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="tp_platform" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.surfaceRaised} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.surface} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="tp_connect" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="0" />
          <Stop offset="0.5" stopColor={colors.primary} stopOpacity="0.5" />
          <Stop offset="1" stopColor={colors.secondary} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Platform base */}
      <Ellipse cx="110" cy="148" rx="88" ry="14" fill="url(#tp_platform)" opacity="0.7" />

      {/* Connection lines */}
      <Path d="M55 100 Q110 80 165 100" stroke="url(#tp_connect)" strokeWidth="1" strokeDasharray="4 3" fill="none" />
      <Path d="M40 100 Q110 70 180 100" stroke="url(#tp_connect)" strokeWidth="0.8" strokeDasharray="3 4" fill="none" opacity="0.5" />

      {/* Back people (smaller/more opaque) */}
      <Person cx={80} cy={98} scale={0.72} gradId="tp_p3" opacity={0.6} />
      <Person cx={140} cy={98} scale={0.72} gradId="tp_p4" opacity={0.6} />

      {/* Front center person */}
      <Person cx={110} cy={88} scale={1} gradId="tp_p1" />

      {/* Side people */}
      <Person cx={58} cy={108} scale={0.82} gradId="tp_p2" opacity={0.85} />
      <Person cx={162} cy={108} scale={0.82} gradId="tp_p3" opacity={0.85} />

      {/* Status dots */}
      <Circle cx={120} cy={60} r="5" fill={colors.success} />
      <Circle cx={120} cy={60} r="5" stroke={colors.bg} strokeWidth="1.5" />

      {/* Floating avatars/initials chips */}
      <Rect x="8" y="48" width="36" height="20" rx="10" fill={colors.primaryMuted} />
      <Rect x="8" y="48" width="36" height="20" rx="10" stroke={colors.primary} strokeWidth="0.8" opacity="0.5" />
      <Rect x="176" y="48" width="36" height="20" rx="10" fill={colors.secondaryMuted} />
      <Rect x="176" y="48" width="36" height="20" rx="10" stroke={colors.secondary} strokeWidth="0.8" opacity="0.5" />

      {/* Dots in chips */}
      {[18, 26].map((x, i) => (
        <Circle key={i} cx={x} cy={58} r="4" fill={colors.primary} opacity={0.7 - i * 0.2} />
      ))}
      {[186, 194, 202].map((x, i) => (
        <Circle key={i} cx={x} cy={58} r="3" fill={colors.secondary} opacity={0.7 - i * 0.2} />
      ))}
    </Svg>
  );
}
