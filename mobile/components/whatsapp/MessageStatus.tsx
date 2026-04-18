import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type MessageStatusType = 'sent' | 'delivered' | 'read' | 'failed';

interface MessageStatusProps {
  status: MessageStatusType;
  size?: number;
}

export default function MessageStatus({ status, size = 14 }: MessageStatusProps) {
  if (status === 'failed') {
    return (
      <Text style={[styles.base, { fontSize: size, color: '#ef4444' }]}>✕</Text>
    );
  }
  if (status === 'sent') {
    return (
      <Text style={[styles.base, { fontSize: size, color: '#8696a0' }]}>✓</Text>
    );
  }
  if (status === 'delivered') {
    return (
      <Text style={[styles.base, { fontSize: size, color: '#8696a0' }]}>✓✓</Text>
    );
  }
  if (status === 'read') {
    return (
      <Text style={[styles.base, { fontSize: size, color: '#53bdeb' }]}>✓✓</Text>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  base: {
    fontWeight: '700',
  },
});
