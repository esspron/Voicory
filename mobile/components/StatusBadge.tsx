import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  completed: { bg: '#22c55e22', text: '#22c55e' },
  failed: { bg: '#ef444422', text: '#ef4444' },
  busy: { bg: '#f59e0b22', text: '#f59e0b' },
  'no-answer': { bg: '#9ca3af22', text: '#9ca3af' },
  'in-progress': { bg: '#00d4aa22', text: '#00d4aa' },
  queued: { bg: '#818cf822', text: '#818cf8' },
  ringing: { bg: '#06b6d422', text: '#06b6d4' },
};

interface StatusBadgeProps {
  status: 'completed' | 'failed' | 'busy' | 'no-answer' | 'in-progress' | 'queued' | 'ringing';
  style?: ViewStyle;
}

export function StatusBadge({ status, style }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] || { bg: '#37415122', text: '#9ca3af' };
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.text, { color: colors.text }]}>{status.replace('-', ' ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});