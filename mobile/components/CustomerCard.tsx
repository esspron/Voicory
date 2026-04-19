import React, { useRef, useState } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as C } from '../lib/theme';
import { Customer } from '../types';
import { ActionSheet } from './ActionSheet';

const SOURCE_GRADIENTS: Record<string, [string, string]> = {
  inbound:  ['#00d4aa', '#0099ff'],
  outbound: ['#00d4aa', '#00b894'],
  whatsapp: ['#22c55e', '#16a34a'],
  vapi:     ['#a855f7', '#7c3aed'],
  twilio:   ['#ef4444', '#dc2626'],
};

// Deterministic gradient per name initial
const FALLBACK_GRADIENTS: [string, string][] = [
  ['#00d4aa', '#0099ff'],
  ['#a855f7', '#ec4899'],
  ['#f59e0b', '#ef4444'],
  ['#0099ff', '#6366f1'],
  ['#22c55e', '#00d4aa'],
];

function getGradient(name?: string, source?: string): [string, string] {
  if (source && SOURCE_GRADIENTS[source]) return SOURCE_GRADIENTS[source];
  const idx = name ? name.charCodeAt(0) % FALLBACK_GRADIENTS.length : 0;
  return FALLBACK_GRADIENTS[idx];
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface CustomerCardProps {
  customer: Customer;
  onPress: (customer: Customer) => void;
  onViewDetails?: (customer: Customer) => void;
}

export function CustomerCard({ customer, onPress, onViewDetails }: CustomerCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  const gradColors = getGradient(customer.name, customer.source);

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const handleLongPress = () => {
    setActionSheetVisible(true);
  };

  const actionItems = [
    ...(customer.phone_number
      ? [
          {
            icon: 'call-outline',
            label: 'Call',
            sublabel: customer.phone_number,
            onPress: () => Linking.openURL(`tel:${customer.phone_number}`),
          },
          {
            icon: 'chatbubble-outline',
            label: 'Message',
            sublabel: 'Open WhatsApp chat',
            onPress: () => Linking.openURL(`https://wa.me/${customer.phone_number.replace(/\D/g, '')}`),
          },
        ]
      : []),
    {
      icon: 'person-outline',
      label: 'View Details',
      onPress: () => (onViewDetails ?? onPress)(customer),
    },
  ];

  return (
    <>
      <Animated.View style={[styles.cardWrap, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => onPress(customer)}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onLongPress={handleLongPress}
          delayLongPress={400}
          activeOpacity={1}
        >
        {/* Gradient Avatar */}
        <View style={styles.avatarWrap}>
          <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarGradient}>
            <Text style={styles.avatarText}>{getInitials(customer.name)}</Text>
          </LinearGradient>
          {/* Online-style ring glow */}
          <View style={[styles.avatarRing, { borderColor: gradColors[0] + '60' }]} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>
              {customer.name || 'Unknown'}
            </Text>
            {/* Interaction count badge */}
            {customer.interaction_count > 0 && (
              <View style={styles.badge}>
                <Ionicons name="call" size={9} color={C.primary} style={{ marginRight: 3 }} />
                <Text style={styles.badgeText}>{customer.interaction_count}</Text>
              </View>
            )}
          </View>

          <Text style={styles.phone} numberOfLines={1}>
            {customer.phone_number}
          </Text>

          <View style={styles.bottomRow}>
            <Ionicons name="time-outline" size={11} color={C.textFaint} />
            <Text style={styles.timeText}>{timeAgo(customer.last_interaction)}</Text>
          </View>
        </View>

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
        </TouchableOpacity>
      </Animated.View>

      <ActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        title={customer.name || customer.phone_number}
        items={actionItems}
      />
    </>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    marginHorizontal: 16,
    marginVertical: 5,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarWrap: {
    marginRight: 14,
    position: 'relative',
  },
  avatarGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
  },
  avatarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  name: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primaryMuted,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.primary + '40',
  },
  badgeText: {
    color: C.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  phone: {
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timeText: {
    color: C.textFaint,
    fontSize: 11,
    fontWeight: '500',
  },
});
