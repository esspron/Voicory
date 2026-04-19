import React, { useRef, useCallback, useState } from 'react';
import {
  Animated,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CallLog } from '../types';
import { StatusBadge } from './StatusBadge';
import { colors as C, radii, shadows, typography } from '../lib/theme';
import { ActionSheet } from './ActionSheet';

const USD_TO_INR = 84;

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface CallCardProps {
  call: CallLog;
  onPress: (call: CallLog) => void;
}

// Direction icon + gradient ring config
const DIRECTION_CONFIG = {
  inbound: {
    icon: 'arrow-down-outline' as const,
    gradientColors: ['#22c55e30', '#16a34a20'] as [string, string],
    ringColor: '#22c55e40',
    iconColor: '#4ade80',
  },
  outbound: {
    icon: 'arrow-up-outline' as const,
    gradientColors: ['#0099ff30', '#0070dd20'] as [string, string],
    ringColor: '#0099ff40',
    iconColor: '#60b8ff',
  },
};

// Status dot color for right-side indicator
const STATUS_DOT: Record<string, string> = {
  completed: '#22c55e',
  failed: '#ef4444',
  'in-progress': '#f59e0b',
  busy: '#f97316',
  'no-answer': '#6b7280',
  queued: '#0099ff',
  ringing: '#00d4aa',
};

export function CallCard({ call, onPress }: CallCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      damping: 20,
      stiffness: 300,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 200,
    }).start();
  }, [scaleAnim]);

  const displayNumber =
    call.direction === 'inbound'
      ? call.from_number || call.phone_number
      : call.to_number || call.phone_number;

  const handleLongPress = useCallback(() => {
    setActionSheetVisible(true);
  }, []);

  const canCallBack =
    call.status === 'completed' || call.status === 'no-answer' || call.status === 'busy';

  const actionItems = [
    ...(canCallBack
      ? [
          {
            icon: 'call-outline',
            label: 'Call Back',
            sublabel: displayNumber || undefined,
            onPress: () => {
              if (displayNumber) Linking.openURL(`tel:${displayNumber}`);
            },
          },
        ]
      : []),
    {
      icon: 'information-circle-outline',
      label: 'View Details',
      onPress: () => onPress(call),
    },
    {
      icon: 'copy-outline',
      label: 'Copy Number',
      sublabel: displayNumber || undefined,
      onPress: () => {
        // Clipboard: implement when expo-clipboard is added
      },
    },
  ];

  const dirConf = DIRECTION_CONFIG[call.direction] ?? DIRECTION_CONFIG.outbound;
  const dotColor = STATUS_DOT[call.status] ?? C.textMuted;

  const cost = call.cost ?? 0;
  const costInr = (cost * USD_TO_INR).toFixed(2);

  return (
    <>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => onPress(call)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        delayLongPress={400}
      >
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        {/* LEFT: Direction icon with gradient ring */}
        <View style={styles.iconWrapper}>
          {/* Outer glow ring */}
          <View style={[styles.iconRing, { borderColor: dirConf.ringColor }]} />
          <LinearGradient
            colors={dirConf.gradientColors}
            style={styles.iconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={dirConf.icon} size={18} color={dirConf.iconColor} />
          </LinearGradient>
        </View>

        {/* CENTER: Caller info */}
        <View style={styles.content}>
          {/* Top row: number + status badge */}
          <View style={styles.topRow}>
            <Text style={styles.phoneNumber} numberOfLines={1}>
              {displayNumber}
            </Text>
            <StatusBadge status={call.status} />
          </View>

          {/* Assistant name */}
          {call.assistant?.name ? (
            <Text style={styles.assistantName} numberOfLines={1}>
              via {call.assistant.name}
            </Text>
          ) : null}

          {/* Bottom meta row */}
          <View style={styles.metaRow}>
            {call.duration_seconds ? (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={11} color={C.textMuted} />
                <Text style={styles.metaText}>{formatDuration(call.duration_seconds)}</Text>
              </View>
            ) : null}
            {cost > 0 && (
              <View style={styles.metaChip}>
                <Text style={styles.costText}>₹{costInr}</Text>
              </View>
            )}
          </View>
        </View>

        {/* RIGHT: Animated status dot + chevron */}
        <View style={styles.rightSide}>
          <View style={styles.statusDotContainer}>
            <View style={[styles.statusDotOuter, { backgroundColor: dotColor + '25' }]}>
              <View style={[styles.statusDotInner, { backgroundColor: dotColor }]} />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={14} color={C.textFaint} />
        </View>
      </Animated.View>
    </TouchableOpacity>

      <ActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        title={displayNumber || 'Call Actions'}
        items={actionItems}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: radii.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: C.border,
    ...shadows.md,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
  },
  iconRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  phoneNumber: {
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
    letterSpacing: 0.2,
  },
  assistantName: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  costText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  rightSide: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    gap: 4,
  },
  statusDotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
