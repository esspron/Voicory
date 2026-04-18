import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Circle, Ellipse, G } from 'react-native-svg';
import { colors } from '../../lib/theme';

interface Props {
  size?: number;
}

export function OnboardingHero({ size = 320 }: Props) {
  const w = size;
  const h = size * 0.85;

  return (
    <Svg width={w} height={h} viewBox="0 0 320 272" fill="none">
      <Defs>
        <LinearGradient id="oh_bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primaryMuted} stopOpacity="1" />
          <Stop offset="0.5" stopColor={colors.secondaryMuted} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.bg} stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="oh_orb1" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.secondary} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="oh_orb2" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.secondary} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.primary} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="oh_card" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.surfaceElevated} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.surface} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="oh_wave" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="0" />
          <Stop offset="0.5" stopColor={colors.primary} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.secondary} stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="oh_shine" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="white" stopOpacity="0.08" />
          <Stop offset="1" stopColor="white" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Background glow */}
      <Ellipse cx="160" cy="136" rx="140" ry="100" fill="url(#oh_bg)" opacity="0.5" />

      {/* Ring decorations */}
      {[120, 100, 80].map((r, i) => (
        <Circle
          key={i}
          cx="160"
          cy="124"
          r={r}
          stroke={colors.primary}
          strokeWidth="1"
          strokeDasharray={`${r * 0.4} ${r * 0.3}`}
          fill="none"
          opacity={0.06 + i * 0.03}
        />
      ))}

      {/* Central orb */}
      <Circle cx="160" cy="124" r="62" fill="url(#oh_orb1)" opacity="0.12" />
      <Circle cx="160" cy="124" r="48" fill="url(#oh_orb1)" opacity="0.18" />
      <Circle cx="160" cy="124" r="34" fill="url(#oh_orb1)" opacity="0.9" />
      {/* Shine on orb */}
      <Circle cx="160" cy="124" r="34" fill="url(#oh_shine)" />

      {/* Mic icon in orb */}
      <Path
        d="M160 108 C156.686 108 154 110.686 154 114 L154 122 C154 125.314 156.686 128 160 128 C163.314 128 166 125.314 166 122 L166 114 C166 110.686 163.314 108 160 108Z"
        fill="white"
        opacity="0.9"
      />
      <Path
        d="M152 122 C152 128 155.582 133 160 133.5 L160 136 L157 136"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <Path
        d="M168 122 C168 128 164.418 133 160 133.5 L160 136 L163 136"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />

      {/* Waveform arcs around orb */}
      {[50, 64, 78].map((r, i) => (
        <Path
          key={i}
          d={`M${160 - r * 0.7} ${124 - r * 0.7} A${r} ${r} 0 0 1 ${160 + r * 0.7} ${124 - r * 0.7}`}
          stroke="url(#oh_wave)"
          strokeWidth={1.5 - i * 0.3}
          strokeLinecap="round"
          fill="none"
          opacity={0.7 - i * 0.2}
        />
      ))}

      {/* Floating stat cards */}
      <G>
        <Rect x="14" y="80" width="88" height="48" rx="14" fill="url(#oh_card)" />
        <Rect x="14" y="80" width="88" height="48" rx="14" stroke={colors.border} strokeWidth="1" />
        <Circle cx="36" cy="100" r="10" fill={colors.primaryMuted} />
        <Circle cx="36" cy="100" r="10" stroke={colors.primary} strokeWidth="1" opacity="0.4" />
        <Path d="M30 100 L34 96 L38 100 L42 95" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Rect x="52" y="94" width="40" height="5" rx="2.5" fill={colors.textFaint} opacity="0.7" />
        <Rect x="52" y="104" width="28" height="4" rx="2" fill={colors.textFaint} opacity="0.4" />
        {/* Green dot */}
        <Circle cx="90" cy="86" r="4" fill={colors.success} />
      </G>

      <G>
        <Rect x="218" y="80" width="88" height="48" rx="14" fill="url(#oh_card)" />
        <Rect x="218" y="80" width="88" height="48" rx="14" stroke={colors.border} strokeWidth="1" />
        <Circle cx="240" cy="100" r="10" fill={colors.secondaryMuted} />
        <Circle cx="240" cy="100" r="10" stroke={colors.secondary} strokeWidth="1" opacity="0.4" />
        <Rect x="256" y="94" width="38" height="5" rx="2.5" fill={colors.textFaint} opacity="0.7" />
        <Rect x="256" y="104" width="26" height="4" rx="2" fill={colors.textFaint} opacity="0.4" />
        <Circle cx="238" cy="97" r="3" fill={colors.secondary} opacity="0.8" />
        <Path d="M234 103 C234 100 236 98 240 98 C244 98 246 100 246 103" fill={colors.secondary} opacity="0.4" />
      </G>

      {/* Bottom floating pill */}
      <Rect x="92" y="202" width="136" height="40" rx="20" fill="url(#oh_card)" />
      <Rect x="92" y="202" width="136" height="40" rx="20" stroke={colors.border} strokeWidth="1" />
      <Circle cx="116" cy="222" r="12" fill="url(#oh_orb1)" opacity="0.85" />
      <Path d="M110 222 L114 218 L118 222 L122 216" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Rect x="136" y="216" width="60" height="5" rx="2.5" fill={colors.textFaint} opacity="0.7" />
      <Rect x="136" y="226" width="42" height="4" rx="2" fill={colors.textFaint} opacity="0.4" />

      {/* Small dot sparkles */}
      <Circle cx="62" cy="56" r="4" fill={colors.primary} opacity="0.5" />
      <Circle cx="258" cy="56" r="3" fill={colors.secondary} opacity="0.5" />
      <Circle cx="44" cy="170" r="2.5" fill={colors.primary} opacity="0.3" />
      <Circle cx="276" cy="168" r="2" fill={colors.secondary} opacity="0.3" />
    </Svg>
  );
}
