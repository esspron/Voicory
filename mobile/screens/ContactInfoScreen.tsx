import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { WhatsAppContact } from '../types/whatsapp';
import ContactAvatar from '../components/whatsapp/ContactAvatar';

interface Props {
  route: { params: { contact: WhatsAppContact } };
  navigation: any;
}

export default function ContactInfoScreen({ route, navigation }: Props) {
  const { contact } = route.params;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Info</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar + Name */}
        <View style={styles.profileSection}>
          <ContactAvatar
            name={contact.name}
            profilePictureUrl={contact.profile_picture_url}
            size={100}
          />
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.contactPhone}>{contact.phone}</Text>
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>About</Text>
          <Text style={styles.cardValue}>Hey there! I am using WhatsApp.</Text>
        </View>

        {/* Status */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Status</Text>
          <Text style={[styles.cardValue, contact.is_active ? styles.activeText : styles.inactiveText]}>
            {contact.is_active ? '● Active' : '○ Inactive'}
          </Text>
        </View>

        {/* Media, Links, Docs — placeholder */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Media, Links, and Docs</Text>
          <View style={styles.mediaGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={styles.mediaPlaceholder} />
            ))}
          </View>
          <TouchableOpacity style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>See All Media →</Text>
          </TouchableOpacity>
        </View>

        {/* Call history placeholder */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Recent Calls</Text>
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>No calls with this contact yet.</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionRow}>
            <Text style={styles.actionIcon}>🚫</Text>
            <Text style={styles.actionText}>Block {contact.name}</Text>
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity style={styles.actionRow}>
            <Text style={styles.actionIcon}>⚠️</Text>
            <Text style={[styles.actionText, styles.dangerText]}>Report {contact.name}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  backIcon: {
    fontSize: 22,
    color: '#ffffff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  scroll: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingTop: 32,
    paddingBottom: 28,
    gap: 10,
    marginBottom: 8,
  },
  contactName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 8,
  },
  contactPhone: {
    fontSize: 16,
    color: '#8696a0',
  },
  card: {
    backgroundColor: '#111827',
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  cardLabel: {
    fontSize: 13,
    color: '#00d4aa',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardValue: {
    fontSize: 15,
    color: '#ffffff',
    lineHeight: 20,
  },
  activeText: {
    color: '#25d366',
  },
  inactiveText: {
    color: '#8696a0',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  mediaPlaceholder: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#1f2c34',
    borderRadius: 6,
  },
  seeAllBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  seeAllText: {
    color: '#00d4aa',
    fontSize: 14,
    fontWeight: '500',
  },
  emptySection: {
    paddingVertical: 12,
  },
  emptySectionText: {
    color: '#8696a0',
    fontSize: 14,
    textAlign: 'center',
  },
  actionsCard: {
    backgroundColor: '#111827',
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionText: {
    fontSize: 16,
    color: '#ffffff',
  },
  dangerText: {
    color: '#ef4444',
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2d3748',
    marginLeft: 56,
  },
  bottomPadding: {
    height: 32,
  },
});
