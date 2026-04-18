import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { WhatsAppContact } from '../types/whatsapp';
import ContactAvatar from '../components/whatsapp/ContactAvatar';

interface Props {
  phone?: string;
}

export default function ContactInfoScreen({ phone: phoneProp }: Props) {
  const { user } = useAuth();
  const [contact, setContact] = useState<WhatsAppContact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !phoneProp) return;
    supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('user_id', user.id)
      .eq('phone', phoneProp)
      .single()
      .then(({ data }) => {
        setContact(data as WhatsAppContact ?? { id: '', user_id: user.id, phone: phoneProp, name: phoneProp, last_message_at: '', unread_count: 0, is_active: true, created_at: '' });
        setLoading(false);
      });
  }, [user, phoneProp]);

  if (loading || !contact) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00d4aa" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Info</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <ContactAvatar name={contact.name} profilePictureUrl={contact.profile_picture_url} size={100} />
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.contactPhone}>{contact.phone}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Status</Text>
          <Text style={[styles.cardValue, contact.is_active ? styles.activeText : styles.inactiveText]}>
            {contact.is_active ? '● Active' : '○ Inactive'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Media, Links, and Docs</Text>
          <View style={styles.mediaGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={styles.mediaPlaceholder} />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Recent Calls</Text>
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>No calls with this contact yet.</Text>
          </View>
        </View>

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
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1a' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 14, paddingHorizontal: 14, gap: 12 },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: '#ffffff' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff' },
  scroll: { flex: 1 },
  profileSection: { alignItems: 'center', backgroundColor: '#111827', paddingTop: 32, paddingBottom: 28, gap: 10, marginBottom: 8 },
  contactName: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginTop: 8 },
  contactPhone: { fontSize: 16, color: '#8696a0' },
  card: { backgroundColor: '#111827', marginBottom: 8, paddingHorizontal: 20, paddingVertical: 16, gap: 10 },
  cardLabel: { fontSize: 13, color: '#00d4aa', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  cardValue: { fontSize: 15, color: '#ffffff', lineHeight: 20 },
  activeText: { color: '#25d366' },
  inactiveText: { color: '#8696a0' },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  mediaPlaceholder: { width: '31%' as any, aspectRatio: 1, backgroundColor: '#1f2c34', borderRadius: 6 },
  emptySection: { paddingVertical: 12 },
  emptySectionText: { color: '#8696a0', fontSize: 14, textAlign: 'center' },
  actionsCard: { backgroundColor: '#111827', marginBottom: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 16 },
  actionIcon: { fontSize: 20 },
  actionText: { fontSize: 16, color: '#ffffff' },
  dangerText: { color: '#ef4444' },
  actionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#2d3748', marginLeft: 56 },
});
