import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Circle, G } from 'react-native-svg';
import { colors } from '../../lib/theme';

interface Props {
  size?: number;
}

export function AnalyticsDashboard({ size = 240 }: Props) {
  const w = size;
  const h = size * 0.75;

  return (
    <Svg width={w} height={h} viewBox="0 0 240 180" fill="none">
      <Defs>
        <LinearGradient id="ad_bar1" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.primary} stopOpacity="0.2" />
        </LinearGradient>
        <LinearGradient id="ad_bar2" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.secondary} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.secondary} stopOpacity="0.2" />
        </LinearGradient>
        <LinearGradient id="ad_line" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="0" />
          <Stop offset="0.5" stopColor={colors.primary} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.secondary} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="ad_area" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.primary} stopOpacity="0.3" />
          <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="ad_card" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.surfaceElevated} stopOpacity="1" />
          <Stop offset="1" stopColor={colors.surface} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Main card bg */}
      <Rect x="8" y="8" width="224" height="164" rx="16" fill={colors.surface} opacity="0.95" />
      <Rect x="8" y="8" width="224" height="164" rx="16" stroke={colors.border} strokeWidth="1" />

      {/* Top stat chips */}
      <Rect x="20" y="20" width="64" height="28" rx="8" fill={colors.primaryMuted} />
      <Rect x="20" y="20" width="64" height="28" rx="8" stroke={colors.primary} strokeWidth="0.5" opacity="0.4" />
      <Path d="M30 34 L38 28 L46 32 L54 26 L62 30" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <Rect x="92" y="20" width="64" height="28" rx="8" fill={colors.secondaryMuted} />
      <Rect x="92" y="20" width="64" height="28" rx="8" stroke={colors.secondary} strokeWidth="0.5" opacity="0.4" />
      <Path d="M102 32 L110 28 L118 34 L126 26 L134 30" stroke={colors.secondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <Rect x="164" y="20" width="52" height="28" rx="8" fill={colors.surfaceRaised} />
      <Circle cx="180" cy="34" r="5" fill={colors.warning} opacity="0.8" />
      <Rect x="190" y="31" width="18" height="3" rx="1.5" fill={colors.textFaint} />
      <Rect x="190" y="36" width="12" height="2" rx="1" fill={colors.textFaint} opacity="0.5" />

      {/* Area chart */}
      <Path
        d="M20 130 L50 110 L80 118 L110 90 L140 100 L170 78 L200 88 L220 80 L220 150 L20 150Z"
        fill="url(#ad_area)"
      />
      <Path
        d="M20 130 L50 110 L80 118 L110 90 L140 100 L170 78 L200 88 L220 80"
        stroke="url(#ad_line)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Data points */}
      {[[50,110],[110,90],[170,78],[220,80]].map(([x,y],i) => (
        <G key={i}>
          <Circle cx={x} cy={y} r="4" fill={colors.bg} />
          <Circle cx={x} cy={y} r="4" stroke={i === 2 ? colors.primary : colors.secondary} strokeWidth="1.5" />
          <Circle cx={x} cy={y} r="2" fill={i === 2 ? colors.primary : colors.secondary} />
        </G>
      ))}

      {/* Bar chart mini */}
      {[40, 60, 35, 50, 70, 45].map((h, i) => (
        <Rect
          key={i}
          x={24 + i * 14}
          y={150 - h}
          width="8"
          height={h}
          rx="3"
          fill={i % 2 === 0 ? 'url(#ad_bar1)' : 'url(#ad_bar2)'}
          opacity="0.7"
        />
      ))}

      {/* Baseline */}
      <Path d="M20 150 L220 150" stroke={colors.border} strokeWidth="0.5" />
    </Svg>
  );
}
