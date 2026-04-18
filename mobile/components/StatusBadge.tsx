import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../lib/theme';

const STATUS_CONFIG: Record<string, { dotColor: string; textColor: string; text: string }> = {
  completed: { 
    dotColor: theme.colors.success, 
    textColor: theme.colors.success, 
    text: 'Completed' 
  },
  failed: { 
    dotColor: theme.colors.danger, 
    textColor: theme.colors.danger, 
    text: 'Failed' 
  },
  'in-progress': { 
    dotColor: theme.colors.warning, 
    textColor: theme.colors.warning, 
    text: 'In Progress' 
  },
  busy: { 
    dotColor: '#f97316', 
    textColor: '#f97316', 
    text: 'Busy' 
  },
  'no-answer': { 
    dotColor: theme.colors.textTertiary, 
    textColor: theme.colors.textTertiary, 
    text: 'No Answer' 
  },
  queued: { 
    dotColor: theme.colors.secondary, 
    textColor: theme.colors.secondary, 
    text: 'Queued' 
  },
  ringing: { 
    dotColor: theme.colors.primary, 
    textColor: theme.colors.primary, 
    text: 'Ringing' 
  },
};

interface StatusBadgeProps {
  status: 'completed' | 'failed' | 'busy' | 'no-answer' | 'in-progress' | 'queued' | 'ringing';
  style?: ViewStyle;
}

export function StatusBadge({ status, style }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { 
    dotColor: theme.colors.textTertiary, 
    textColor: theme.colors.textTertiary,
    text: status.replace('-', ' ') 
  };

  return (
    <View style={[styles.badge, style]}>
      <View style={[styles.dot, { backgroundColor: config.dotColor }]} />
      <Text style={[styles.text, { color: config.textColor }]}>{config.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: theme.fontWeight.medium,
  },
});