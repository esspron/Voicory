import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../lib/theme';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Ionicons name="home" size={48} color={theme.colors.primary} />
        <Text style={styles.screenName}>Dashboard</Text>
        <Text style={styles.hint}>Overview & analytics coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  screenName: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  hint: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
