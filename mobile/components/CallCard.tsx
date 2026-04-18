import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CallLog } from '../types';
import { StatusBadge } from './StatusBadge';
import { theme } from '../lib/theme';

const USD_TO_INR = 84;

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface CallCardProps {
  call: CallLog;
  onPress: (call: CallLog) => void;
}

export function CallCard({ call, onPress }: CallCardProps) {
  const cost = call.cost || 0;
  const costInr = (cost * USD_TO_INR).toFixed(2);
  
  // Use from_number/to_number based on direction, fallback to phone_number
  const displayNumber = call.direction === 'inbound' 
    ? call.from_number || call.phone_number
    : call.to_number || call.phone_number;

  const directionIcon = call.direction === 'inbound' ? 'arrow-down' : 'arrow-up';
  const directionColor = call.direction === 'inbound' ? theme.colors.success : theme.colors.secondary;

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => onPress(call)} 
      activeOpacity={0.7}
    >
      {/* Direction arrow icon */}
      <View style={[styles.iconContainer, { backgroundColor: directionColor + '15' }]}>
        <Ionicons
          name={directionIcon}
          size={20}
          color={directionColor}
        />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.phoneNumber} numberOfLines={1}>
            {displayNumber}
          </Text>
          <StatusBadge status={call.status} />
        </View>
        
        {call.assistant?.name ? (
          <Text style={styles.assistantName} numberOfLines={1}>
            {call.assistant.name}
          </Text>
        ) : null}
        
        <View style={styles.metaRow}>
          <View style={styles.leftMeta}>
            <Text style={styles.metaText}>
              {formatDuration(call.duration_seconds)}
            </Text>
            {cost > 0 && (
              <Text style={styles.costText}>₹{costInr}</Text>
            )}
          </View>
          <Text style={styles.timeText}>
            {call.started_at ? timeAgo(call.started_at) : timeAgo(call.created_at)}
          </Text>
        </View>
      </View>

      {/* Chevron */}
      <Ionicons 
        name="chevron-forward" 
        size={18} 
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginVertical: 6,
    borderWidth: theme.card.borderWidth,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  phoneNumber: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.fontWeight.semibold,
    flex: 1,
    marginRight: 12,
  },
  assistantName: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: theme.fontWeight.medium,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: theme.fontWeight.medium,
  },
  costText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: theme.fontWeight.semibold,
  },
  timeText: {
    color: theme.colors.textTertiary,
    fontSize: 12,
    fontWeight: theme.fontWeight.medium,
  },
});