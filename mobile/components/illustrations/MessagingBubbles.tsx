import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Circle, G } from 'react-native-svg';
import { colors } from '../../lib/theme';

interface Props {
  size?: number;
}

export function MessagingBubbles({ size = 200 }: Props) {
  const w = size;
  const h = size * 0.85;

  return (
    <Svg width={w} height={h} viewBox="0 0 200 170" fill="none">
      <Defs>
        <LinearGradient id="mb_sent" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.primaryDark} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="mb_recv" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.surfaceElevated} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.surfaceRaised} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="mb_accent" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.secondary} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.primary} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Received bubble 1 — large */}
      <Rect x="12" y="12" width="110" height="44" rx="18" fill="url(#mb_recv)" />
      <Rect x="12" y="12" width="110" height="44" rx="18" stroke={colors.border} strokeWidth="1" />
      {/* Tail */}
      <Path d="M16 56 L8 68 L28 58" fill={colors.surfaceRaised} />
      {/* Text lines */}
      <Rect x="26" y="26" width="70" height="6" rx="3" fill={colors.textFaint} opacity="0.7" />
      <Rect x="26" y="38" width="50" height="5" rx="2.5" fill={colors.textFaint} opacity="0.4" />

      {/* Sent bubble 1 */}
      <Rect x="80" y="72" width="108" height="44" rx="18" fill="url(#mb_sent)" />
      {/* Tail right */}
      <Path d="M184 116 L196 128 L174 118" fill={colors.primaryDark} />
      {/* Text lines */}
      <Rect x="94" y="86" width="68" height="6" rx="3" fill="white" opacity="0.5" />
      <Rect x="94" y="98" width="46" height="5" rx="2.5" fill="white" opacity="0.3" />

      {/* Received bubble 2 — small */}
      <Rect x="12" y="120" width="86" height="36" rx="14" fill="url(#mb_recv)" />
      <Rect x="12" y="120" width="86" height="36" rx="14" stroke={colors.border} strokeWidth="1" />
      <Rect x="26" y="132" width="55" height="5" rx="2.5" fill={colors.textFaint} opacity="0.6" />
      <Rect x="26" y="143" width="38" height="4" rx="2" fill={colors.textFaint} opacity="0.35" />

      {/* Typing indicator bubble */}
      <Rect x="110" y="124" width="68" height="32" rx="14" fill="url(#mb_accent)" opacity="0.85" />
      <Circle cx="130" cy="140" r="4" fill="white" opacity="0.9" />
      <Circle cx="144" cy="140" r="4" fill="white" opacity="0.6" />
      <Circle cx="158" cy="140" r="4" fill="white" opacity="0.35" />

      {/* Avatar circles */}
      <Circle cx="190" cy="124" r="10" fill={colors.primaryMuted} />
      <Circle cx="190" cy="124" r="10" stroke={colors.primary} strokeWidth="1" opacity="0.5" />
      <Circle cx="190" cy="121" r="4" fill={colors.primary} opacity="0.6" />
      <Path d="M183 131 C183 127 186 125 190 125 C194 125 197 127 197 131" fill={colors.primary} opacity="0.4" />
    </Svg>
  );
}
