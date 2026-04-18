import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../lib/theme';
import { Customer } from '../types';

const SOURCE_COLORS: Record<string, [string, string]> = {
  inbound: [theme.colors.secondary, '#0077cc'],
  outbound: [theme.colors.primary, theme.colors.primaryDark],
  whatsapp: [theme.colors.success, '#16a34a'],
};

function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

interface CustomerCardProps {
  customer: Customer;
  onPress: (customer: Customer) => void;
}

export function CustomerCard({ customer, onPress }: CustomerCardProps) {
  const gradientColors: [string, string] = (SOURCE_COLORS[customer.source || ''] || [theme.colors.textTertiary, theme.colors.textSecondary]) as [string, string];

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => onPress(customer)} 
      activeOpacity={0.7}
    >
      {/* Avatar with gradient background + initials */}
      <View style={styles.avatar}>
        <LinearGradient
          colors={gradientColors}
          style={styles.avatarGradient}
        >
          <Text style={styles.avatarText}>
            {getInitials(customer.name)}
          </Text>
        </LinearGradient>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {customer.name}
          </Text>
          {customer.interaction_count > 0 && (
            <View style={styles.interactionBadge}>
              <Text style={styles.interactionCount}>
                {customer.interaction_count}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={styles.phone} numberOfLines={1}>
          {customer.phone_number}
        </Text>
        
        {customer.email && (
          <Text style={styles.email} numberOfLines={1}>
            {customer.email}
          </Text>
        )}
        
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {customer.interaction_count} {customer.interaction_count === 1 ? 'call' : 'calls'}
          </Text>
          <Text style={styles.separator}>•</Text>
          <Text style={styles.metaText}>
            Last: {timeAgo(customer.last_interaction)}
          </Text>
        </View>
      </View>

      {/* Right chevron */}
      <Ionicons 
        name="chevron-forward" 
        size={20} 
        color={theme.colors.textTertiary} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 8,
    borderWidth: theme.card.borderWidth,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  avatar: {
    marginRight: 16,
  },
  avatarGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.fontWeight.extrabold,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  name: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: theme.fontWeight.semibold,
    flex: 1,
    marginRight: 12,
  },
  phone: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: theme.fontWeight.medium,
    marginBottom: 4,
  },
  email: {
    color: theme.colors.textTertiary,
    fontSize: 13,
    fontWeight: theme.fontWeight.medium,
    marginBottom: 8,
  },
  meta: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 8,
  },
  metaText: { 
    color: theme.colors.textSecondary, 
    fontSize: 13,
    fontWeight: theme.fontWeight.medium,
  },
  separator: {
    color: theme.colors.textTertiary,
    fontSize: 12,
  },
  interactionBadge: {
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
  },
  interactionCount: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: theme.fontWeight.bold,
  },
});