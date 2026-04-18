import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Circle, Ellipse, G } from 'react-native-svg';
import { colors } from '../../lib/theme';

interface Props {
  size?: number;
}

export function PhoneCall({ size = 200 }: Props) {
  const w = size;
  const h = size;

  return (
    <Svg width={w} height={h} viewBox="0 0 200 200" fill="none">
      <Defs>
        <LinearGradient id="pc_body" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.surfaceElevated} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.surface} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="pc_screen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.primaryMuted} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.bg} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="pc_wave" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="0" />
          <Stop offset="0.5" stopColor={colors.primary} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="pc_btn" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.secondary} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Signal rings */}
      {[70, 52, 35].map((r, i) => (
        <Circle
          key={i}
          cx="100"
          cy="80"
          r={r}
          stroke={colors.primary}
          strokeWidth="1"
          fill="none"
          opacity={0.12 + i * 0.06}
        />
      ))}

      {/* Phone body */}
      <Rect x="68" y="50" width="64" height="110" rx="16" fill="url(#pc_body)" />
      <Rect x="68" y="50" width="64" height="110" rx="16" stroke={colors.border} strokeWidth="1.5" />

      {/* Screen */}
      <Rect x="74" y="62" width="52" height="78" rx="10" fill="url(#pc_screen)" />

      {/* Speaker notch */}
      <Rect x="90" y="55" width="20" height="4" rx="2" fill={colors.border} />

      {/* Home indicator */}
      <Rect x="91" y="148" width="18" height="3" rx="1.5" fill={colors.border} />

      {/* Avatar on screen */}
      <Circle cx="100" cy="88" r="14" fill={colors.primaryMuted} />
      <Circle cx="100" cy="84" r="6" fill={colors.primary} opacity="0.7" />
      <Path d="M88 102 C88 95 93 91 100 91 C107 91 112 95 112 102" fill={colors.primary} opacity="0.5" />

      {/* Call duration */}
      <Rect x="88" y="108" width="24" height="5" rx="2.5" fill={colors.textFaint} opacity="0.5" />

      {/* Call action button */}
      <Circle cx="100" cy="128" r="12" fill="url(#pc_btn)" />
      {/* Phone icon shape in button */}
      <Path
        d="M95 124 C95 124 97 122 99 124 L101 126 C101 126 102 127 101 128 L100 129 C100 129 102 131 103 132 L104 131 C105 130 106 131 106 131 L104 133 C104 133 102 135 98 131 C94 127 95 124 95 124Z"
        fill="white"
        opacity="0.9"
      />

      {/* Signal waves arcs above phone */}
      <Path d="M88 72 Q100 62 112 72" stroke="url(#pc_wave)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
      <Path d="M83 66 Q100 54 117 66" stroke="url(#pc_wave)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
    </Svg>
  );
}
