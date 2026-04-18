import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Circle, Ellipse, G } from 'react-native-svg';
import { colors } from '../../lib/theme';

interface Props {
  size?: number;
}

export function EmptyInbox({ size = 200 }: Props) {
  const w = size;
  const h = size * 0.85;

  return (
    <Svg width={w} height={h} viewBox="0 0 200 170" fill="none">
      <Defs>
        <LinearGradient id="ei_bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.surfaceRaised} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.surface} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="ei_flap" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.surfaceElevated} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.surfaceRaised} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="ei_glow" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="0.15" />
          <Stop offset="1" stopColor={colors.secondary} stopOpacity="0.08" />
        </LinearGradient>
        <LinearGradient id="ei_stars" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.secondary} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Shadow/glow */}
      <Ellipse cx="100" cy="152" rx="60" ry="10" fill={colors.primary} opacity="0.06" />

      {/* Envelope body */}
      <Rect x="28" y="62" width="144" height="96" rx="14" fill="url(#ei_bg)" />
      <Rect x="28" y="62" width="144" height="96" rx="14" stroke={colors.border} strokeWidth="1.5" />
      <Rect x="28" y="62" width="144" height="96" rx="14" fill="url(#ei_glow)" />

      {/* Envelope flap */}
      <Path
        d="M28 76 L100 118 L172 76 L172 62 Q172 62 158 62 L100 96 L42 62 L28 62 Z"
        fill="url(#ei_flap)"
        opacity="0.9"
      />
      <Path
        d="M28 76 L100 118 L172 76"
        stroke={colors.border}
        strokeWidth="1"
        fill="none"
      />

      {/* Envelope bottom fold lines */}
      <Path d="M28 158 L70 124" stroke={colors.border} strokeWidth="0.8" opacity="0.4" />
      <Path d="M172 158 L130 124" stroke={colors.border} strokeWidth="0.8" opacity="0.4" />

      {/* Floating sparkle dots */}
      <Circle cx="56" cy="42" r="3" fill="url(#ei_stars)" opacity="0.7" />
      <Circle cx="148" cy="34" r="2" fill={colors.secondary} opacity="0.6" />
      <Circle cx="168" cy="50" r="1.5" fill={colors.primary} opacity="0.5" />
      <Circle cx="36" cy="52" r="1.5" fill={colors.secondary} opacity="0.4" />

      {/* Star/sparkle top center */}
      <Path
        d="M100 18 L102 26 L110 26 L104 32 L106 40 L100 36 L94 40 L96 32 L90 26 L98 26 Z"
        fill="url(#ei_stars)"
        opacity="0.5"
      />

      {/* Small dot decoration */}
      <Circle cx="100" cy="88" r="5" fill={colors.primaryMuted} />
      <Circle cx="100" cy="88" r="5" stroke={colors.primary} strokeWidth="1" opacity="0.5" />
    </Svg>
  );
}
