import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../lib/theme';

interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradientColors?: [string, string, ...string[]];
  subtitle?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon, 
  gradientColors = [theme.colors.primary, theme.colors.primaryDark] as [string, string],
  subtitle 
}: StatCardProps) {
  return (
    <View style={styles.card}>
      {/* Gradient accent bar at top */}
      <LinearGradient
        colors={gradientColors}
        style={styles.accentBar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
      
      <View style={styles.content}>
        {/* Icon in corner */}
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={24} color={gradientColors[0]} />
        </View>

        {/* Label */}
        <Text style={styles.title}>{title.toUpperCase()}</Text>
        
        {/* Large value number */}
        <Text style={styles.value}>{value}</Text>
        
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.card.borderWidth,
    borderColor: theme.colors.border,
    marginHorizontal: 4,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  accentBar: {
    height: 3,
    width: '100%',
  },
  content: {
    padding: theme.card.padding,
    position: 'relative',
  },
  iconContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    opacity: 0.7,
  },
  title: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    fontWeight: theme.fontWeight.medium,
  },
});