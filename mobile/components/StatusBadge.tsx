/**
 * StatusBadge — Pill-shaped status label.
 * Maps call/assistant status strings to semantic colors.
 * Example statuses: "completed", "failed", "in-progress", "active".
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as C, typography, spacing, radii } from '../lib/theme';

interface StatusConfig {
  gradient: [string, string];
  textColor: string;
  text: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  completed: {
    gradient: ['#22c55e20', '#16a34a20'],
    textColor: '#4ade80',
    text: 'Completed',
  },
  failed: {
    gradient: ['#ef444420', '#dc262620'],
    textColor: '#f87171',
    text: 'Failed',
  },
  'in-progress': {
    gradient: ['#f59e0b20', '#d9770620'],
    textColor: '#fbbf24',
    text: 'Live',
  },
  busy: {
    gradient: ['#f9731620', '#ea580c20'],
    textColor: '#fb923c',
    text: 'Busy',
  },
  'no-answer': {
    gradient: ['#3d4a5c20', '#2d3748 20'],
    textColor: '#8b95a5',
    text: 'No Answer',
  },
  queued: {
    gradient: ['#0099ff20', '#0070dd20'],
    textColor: '#38bdf8',
    text: 'Queued',
  },
  ringing: {
    gradient: ['#00d4aa20', '#00b89420'],
    textColor: '#00d4aa',
    text: 'Ringing',
  },
};

interface StatusBadgeProps {
  status: 'completed' | 'failed' | 'busy' | 'no-answer' | 'in-progress' | 'queued' | 'ringing';
  style?: ViewStyle;
}

export function StatusBadge({ status, style }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    gradient: ['#3d4a5c20', '#2d374820'] as [string, string],
    textColor: C.textSecondary,
    text: status.replace(/-/g, ' '),
  };

  return (
    <LinearGradient
      colors={config.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.badge, style]}
    >
      {/* Animated dot for live statuses */}
      {(status === 'in-progress' || status === 'ringing') && (
        <View style={[styles.liveDot, { backgroundColor: config.textColor }]} />
      )}
      <Text style={[styles.text, { color: config.textColor }]}>{config.text}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.xl,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    ...typography.captionXs,
    letterSpacing: 0.3,
  },
});
