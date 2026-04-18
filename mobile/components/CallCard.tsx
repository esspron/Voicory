import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CallLog } from '../types';
import { StatusBadge } from './StatusBadge';

const COLORS = {
  surface: '#111827',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  border: '#374151',
  primary: '#00d4aa',
};

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

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(call)} activeOpacity={0.75}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={call.direction === 'inbound' ? 'arrow-down-outline' : 'arrow-up-outline'}
          size={18}
          color={call.direction === 'inbound' ? '#00d4aa' : '#818cf8'}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.phone} numberOfLines={1}>
            {displayNumber}
          </Text>
          <StatusBadge status={call.status} />
        </View>
        {call.assistant?.name ? (
          <Text style={styles.assistant} numberOfLines={1}>
            {call.assistant.name}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            <Ionicons name="time-outline" size={12} /> {formatDuration(call.duration_seconds)}
          </Text>
          {cost > 0 && <Text style={styles.metaText}>₹{costInr}</Text>}
          <Text style={styles.metaText}>
            {call.started_at ? timeAgo(call.started_at) : timeAgo(call.created_at)}
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
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  body: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  phone: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  assistant: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    gap: 10,
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});