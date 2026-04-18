import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { colors as C } from '../lib/theme';

// ═══════════════════════════════════════════════════════════════════════════════
// MiniChart — SVG sparkline with gradient-filled area
// Props:
//   data       — array of numbers (Y values)
//   width      — chart width (default 80)
//   height     — chart height (default 32)
//   color      — line/fill color (default primary)
//   style      — container style override
// ═══════════════════════════════════════════════════════════════════════════════

interface MiniChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  style?: ViewStyle;
}

function buildSparkPath(data: number[], w: number, h: number): { line: string; area: string } {
  if (!data || data.length < 2) return { line: '', area: '' };

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = padding + ((1 - (v - min) / range) * (h - padding * 2));
    return { x, y };
  });

  // Smooth curve using quadratic bezier control points
  const lineParts: string[] = [`M${pts[0].x},${pts[0].y}`];
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    lineParts.push(`Q${cx},${pts[i - 1].y} ${pts[i].x},${pts[i].y}`);
  }
  const linePath = lineParts.join(' ');

  // Area: close back down to baseline
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`;

  return { line: linePath, area: areaPath };
}

export function MiniChart({ data, width = 80, height = 32, color, style }: MiniChartProps) {
  const c = color ?? C.primary;
  const gradId = `mc_${c.replace('#', '')}`;
  const { line, area } = buildSparkPath(data ?? [], width, height);

  if (!line) {
    return <View style={[{ width, height }, style]} />;
  }

  return (
    <View style={[{ width, height }, style]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <SvgGrad id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c} stopOpacity="0.35" />
            <Stop offset="1" stopColor={c} stopOpacity="0.00" />
          </SvgGrad>
        </Defs>
        {/* Filled area */}
        <Path d={area} fill={`url(#${gradId})`} />
        {/* Line */}
        <Path d={line} stroke={c} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
