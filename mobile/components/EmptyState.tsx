import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Design tokens
const C = {
  bg: '#050a12',
  surface: '#0c1219',
  surfaceRaised: '#111a24',
  border: '#1a2332',
  borderLight: '#1a233350',
  primary: '#00d4aa',
  primaryMuted: '#00d4aa18',
  secondary: '#0099ff',
  text: '#f0f2f5',
  textMuted: '#7a8599',
  textFaint: '#3d4a5c',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
};

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function EmptyState({
  title = 'No data yet',
  message = 'Nothing to show here.',
  icon = 'folder-open',
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={48} color={C.textFaint} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  title: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: C.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
    fontWeight: '400',
  },
});
