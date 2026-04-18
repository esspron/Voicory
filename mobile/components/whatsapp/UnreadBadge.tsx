import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface UnreadBadgeProps {
  count?: number;
}

export default function UnreadBadge({ count }: UnreadBadgeProps) {
  if (!count || count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  const minWidth = count > 9 ? (count > 99 ? 32 : 26) : 20;

  return (
    <LinearGradient
      colors={['#00d4aa', '#00b894']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, { minWidth }]}
    >
      <Text style={styles.text}>{label}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  text: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
});
