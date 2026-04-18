import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { colors, radii } from '../lib/theme';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Shimmer skeleton loader — Apple-quality loading state.
 */
export function Skeleton({ width, height, borderRadius = radii.md, style }: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.shimmer,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Pre-built skeleton patterns */

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[skeletonStyles.card, style]}>
      <View style={skeletonStyles.cardRow}>
        <Skeleton width={48} height={48} borderRadius={14} />
        <View style={skeletonStyles.cardText}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonStatRow({ count = 4 }: { count?: number }) {
  return (
    <View style={skeletonStyles.statRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={skeletonStyles.stat}>
          <Skeleton width={40} height={24} />
          <Skeleton width={32} height={10} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonListItem() {
  return (
    <View style={skeletonStyles.listItem}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={skeletonStyles.listText}>
        <Skeleton width="55%" height={15} />
        <Skeleton width="35%" height={12} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={40} height={12} />
    </View>
  );
}

export function SkeletonDashboard() {
  return (
    <View style={skeletonStyles.dashboard}>
      {/* Credit card */}
      <View style={skeletonStyles.creditSkeleton}>
        <View>
          <Skeleton width={120} height={36} />
          <Skeleton width={160} height={14} style={{ marginTop: 8 }} />
        </View>
        <Skeleton width={80} height={80} borderRadius={40} />
      </View>
      {/* Stats */}
      <SkeletonStatRow />
      {/* Recent calls */}
      <Skeleton width={100} height={14} style={{ marginTop: 24, marginBottom: 12 }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardText: {
    flex: 1,
  },
  statRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 20,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  listText: {
    flex: 1,
  },
  dashboard: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  creditSkeleton: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
});
