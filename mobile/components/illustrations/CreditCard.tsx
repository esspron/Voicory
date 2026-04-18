import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Circle, G } from 'react-native-svg';
import { colors } from '../../lib/theme';

interface Props {
  size?: number;
}

export function CreditCard({ size = 240 }: Props) {
  const w = size;
  const h = size * 0.65;

  return (
    <Svg width={w} height={h} viewBox="0 0 240 156" fill="none">
      <Defs>
        <LinearGradient id="cc_card1" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="1" />
          <Stop offset="0.6" stopColor={colors.secondary} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.primaryDark} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="cc_card2" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.surfaceElevated} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.surfaceRaised} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="cc_chip" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.warning} stopOpacity="1" />
          <Stop offset="1" stopColor="#e8a000" stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="cc_shine" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="white" stopOpacity="0.12" />
          <Stop offset="1" stopColor="white" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Back card */}
      <Rect x="24" y="20" width="192" height="116" rx="16" fill="url(#cc_card2)" />
      <Rect x="24" y="20" width="192" height="116" rx="16" stroke={colors.border} strokeWidth="1" />

      {/* Front card */}
      <Rect x="12" y="8" width="192" height="116" rx="16" fill="url(#cc_card1)" />
      {/* Shine overlay */}
      <Rect x="12" y="8" width="192" height="116" rx="16" fill="url(#cc_shine)" />

      {/* Decorative circles on card */}
      <Circle cx="170" cy="52" r="44" stroke="white" strokeWidth="1" fill="none" opacity="0.1" />
      <Circle cx="196" cy="52" r="44" stroke="white" strokeWidth="1" fill="none" opacity="0.1" />

      {/* Chip */}
      <Rect x="30" y="34" width="40" height="30" rx="6" fill="url(#cc_chip)" />
      <Rect x="30" y="34" width="40" height="30" rx="6" stroke="#d4900060" strokeWidth="0.5" />
      {/* Chip lines */}
      <Path d="M30 46 L70 46" stroke="#d4900060" strokeWidth="0.5" />
      <Path d="M30 54 L70 54" stroke="#d4900060" strokeWidth="0.5" />
      <Path d="M42 34 L42 64" stroke="#d4900060" strokeWidth="0.5" />
      <Path d="M58 34 L58 64" stroke="#d4900060" strokeWidth="0.5" />

      {/* Contactless symbol */}
      {[8, 13, 18].map((r, i) => (
        <Path
          key={i}
          d={`M78 46 A${r} ${r} 0 0 1 78 ${46 + r * 0.6}`}
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity={0.9 - i * 0.2}
        />
      ))}

      {/* Card number dots */}
      <G opacity="0.8">
        {[0,1,2,3].map(group => (
          <G key={group}>
            {[0,1,2,3].map(dot => (
              <Circle
                key={dot}
                cx={30 + group * 50 + dot * 8}
                cy={84}
                r="3"
                fill={group === 3 ? 'white' : 'white'}
                opacity={group === 3 ? 0.9 : 0.5}
              />
            ))}
          </G>
        ))}
      </G>

      {/* Name line */}
      <Rect x="30" y="100" width="80" height="6" rx="3" fill="white" opacity="0.4" />
      <Rect x="30" y="112" width="50" height="5" rx="2.5" fill="white" opacity="0.25" />

      {/* Expiry */}
      <Rect x="160" y="100" width="36" height="5" rx="2.5" fill="white" opacity="0.35" />
      <Rect x="160" y="110" width="24" height="4" rx="2" fill="white" opacity="0.2" />

      {/* Network logo circles (Visa/MC style) */}
      <Circle cx="176" cy="30" r="12" fill={colors.danger} opacity="0.7" />
      <Circle cx="190" cy="30" r="12" fill={colors.warning} opacity="0.7" />
    </Svg>
  );
}
