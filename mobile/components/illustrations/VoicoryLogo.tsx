import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Path, Circle, G } from 'react-native-svg';
import { colors } from '../../lib/theme';

interface Props {
  size?: number;
}

export function VoicoryLogo({ size = 48 }: Props) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 48 48" fill="none">
      <Defs>
        <LinearGradient id="vl_grad1" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.secondary} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="vl_grad2" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="0.3" />
          <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {/* Background circle */}
      <Circle cx="24" cy="24" r="22" fill={colors.surface} />
      <Circle cx="24" cy="24" r="22" fill="url(#vl_grad2)" />
      {/* Mic body */}
      <Path
        d="M24 10 C20.686 10 18 12.686 18 16 L18 24 C18 27.314 20.686 30 24 30 C27.314 30 30 27.314 30 24 L30 16 C30 12.686 27.314 10 24 10Z"
        fill="url(#vl_grad1)"
        opacity="0.95"
      />
      {/* Mic stand */}
      <Path
        d="M14 24 C14 30.627 18.477 36.163 24.5 37.5 L24.5 40 L21 40"
        stroke={colors.primary}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <Path
        d="M34 24 C34 30.627 29.523 36.163 23.5 37.5 L23.5 40 L27 40"
        stroke={colors.primary}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      {/* Highlight lines on mic */}
      <Path d="M21 17 L21 23" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <Path d="M21 20 L21 20" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0" />
    </Svg>
  );
}
