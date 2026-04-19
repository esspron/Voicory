/**
 * StatCard — Dashboard metric card.
 * Displays a label, animated value, optional trend indicator, and icon.
 * Applies a glow shadow tinted by the `color` prop.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors as C, typography, spacing, radii, shadows } from '../lib/theme';
import { MiniChart } from './MiniChart';
import { AnimatedNumber } from './AnimatedNumber';

// ═══════════════════════════════════════════════════════════════════════════════
// StatCard — Fintech-grade metric card
//
// Features:
//   - Gradient icon background (not flat circle)
//   - AnimatedNumber counter (counts up on mount)
//   - Trend indicator with up/down arrow + percentage (green/red)
//   - Sparkline mini chart
//   - Subtle gradient border/glow effect
// ═══════════════════════════════════════════════════════════════════════════════

export interface StatCardProps {
  title: string;
  /** Numeric value for animated counter */
  value: number;
  /** Display prefix (e.g. "₹") */
  prefix?: string;
  /** Display suffix (e.g. "%") */
  suffix?: string;
  /** Decimal places for the animated number */
  decimals?: number;
  icon: keyof typeof Ionicons.glyphMap;
  /** Two gradient colors for the icon background  */
  gradientColors?: [string, string];
  subtitle?: string;
  /** Trend % change — positive = up (green), negative = down (red) */
  trend?: number;
  /** Historical data points for sparkline */
  sparkData?: number[];
  style?: ViewStyle;
  /** Animation delay offset in ms */
  delay?: number;
}

export function StatCard({
  title,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  icon,
  gradientColors,
  subtitle,
  trend,
  sparkData,
  style,
  delay = 0,
}: StatCardProps) {
  const gc: [string, string] = gradientColors ?? [C.primary, C.primaryDark];

  const hasTrend = trend !== undefined && trend !== null;
  const trendUp = (trend ?? 0) >= 0;
  const trendColor = trendUp ? C.success : C.danger;
  const trendIcon = trendUp ? 'arrow-up' : 'arrow-down';
  const trendText = `${trendUp ? '+' : ''}${(trend ?? 0).toFixed(1)}%`;

  return (
    <View style={[styles.wrapper, style]}>
      {/* Outer glow border gradient */}
      <LinearGradient
        colors={[gc[0] + '30', gc[1] + '10', C.border]}
        style={styles.glowBorder}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.card}>
        {/* Top row: icon + trend */}
        <View style={styles.topRow}>
          {/* Gradient icon bubble */}
          <LinearGradient
            colors={[gc[0] + '30', gc[1] + '20'] as [string, string]}
            style={styles.iconBubble}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <LinearGradient
              colors={gc}
              style={styles.iconInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={icon} size={16} color="#000" />
            </LinearGradient>
          </LinearGradient>

          {/* Trend badge */}
          {hasTrend && (
            <View style={[styles.trendBadge, { backgroundColor: trendColor + '18' }]}>
              <Ionicons name={trendIcon} size={9} color={trendColor} />
              <Text style={[styles.trendText, { color: trendColor }]}>{trendText}</Text>
            </View>
          )}
        </View>

        {/* Label */}
        <Text style={styles.label} numberOfLines={1}>{title.toUpperCase()}</Text>

        {/* Animated counter */}
        <AnimatedNumber
          value={value}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          delay={delay}
          style={styles.value}
        />

        {/* Subtitle */}
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}

        {/* Sparkline */}
        {sparkData && sparkData.length >= 2 ? (
          <View style={styles.sparkWrap}>
            <MiniChart
              data={sparkData}
              width={72}
              height={24}
              color={gc[0]}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    borderRadius: radii.xl,
    padding: 1.5, // glow border thickness
    marginHorizontal: 4,
  },
  glowBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.xl,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: radii.xl - 1,
    padding: spacing.lg,
    paddingBottom: spacing.md,
    ...shadows.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 2,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textFaint,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '500',
    marginBottom: 4,
  },
  sparkWrap: {
    marginTop: spacing.sm,
    alignItems: 'flex-end',
  },
});
