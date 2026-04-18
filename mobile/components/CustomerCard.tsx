import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Customer } from '../types';

const COLORS = {
  surface: '#111827',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  border: '#374151',
  primary: '#00d4aa',
};

const SOURCE_COLORS: Record<string, string> = {
  inbound: '#818cf8',
  outbound: '#00d4aa',
  whatsapp: '#22c55e',
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

interface CustomerCardProps {
  customer: Customer;
  onPress: (customer: Customer) => void;
}

export function CustomerCard({ customer, onPress }: CustomerCardProps) {
  const sourceColor = SOURCE_COLORS[customer.source || ''] || '#9ca3af';

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(customer)} activeOpacity={0.75}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(customer.name || '?')[0].toUpperCase()}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {customer.name}
          </Text>
          {customer.source ? (
            <View style={[styles.sourceBadge, { backgroundColor: sourceColor + '22' }]}>
              <Text style={[styles.sourceText, { color: sourceColor }]}>{customer.source}</Text>
            </View>
          ) : null}
        </View>
        {customer.email ? (
          <Text style={styles.email} numberOfLines={1}>{customer.email}</Text>
        ) : null}
        <Text style={styles.phone}>{customer.phone_number}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            <Ionicons name="call-outline" size={12} /> {customer.interaction_count} calls
          </Text>
          <Text style={styles.metaText}>
            Last: {timeAgo(customer.last_interaction)}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  body: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  name: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  email: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  phone: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  meta: { flexDirection: 'row', gap: 12 },
  metaText: { color: COLORS.textSecondary, fontSize: 12 },
  sourceBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  sourceText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});