import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DateDividerProps {
  label: string; // "Today", "Yesterday", "April 15, 2026"
}

export default function DateDivider({ label }: DateDividerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <Text style={styles.text}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  pill: {
    backgroundColor: '#1f2c34',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    // subtle shadow
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  text: {
    color: '#8696a0',
    fontSize: 12,
    fontWeight: '500',
  },
});
