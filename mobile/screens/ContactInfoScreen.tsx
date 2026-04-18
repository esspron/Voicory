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
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ContactAvatar from '../components/whatsapp/ContactAvatar';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WhatsAppConfig {
  id: string;
  user_id: string;
  waba_id: string;
  phone_number_id: string;
  display_phone_number: string;
  display_name: string;
  access_token: string;
  assistant_id: string;
  status: string;
}

interface WhatsAppContact {
  id: string;
  config_id: string;
  wa_id: string;
  profile_name: string;
  phone_number: string;
  customer_id?: string;
  last_message_at: string;
  total_messages: number;
  created_at?: string;
}

export default function ContactInfoScreen() {
  const { user } = useAuth();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [contact, setContact] = useState<WhatsAppContact | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user's WhatsApp config first
  useEffect(() => {
    if (!user) return;
    supabase
      .from('whatsapp_configs')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setConfig(data as WhatsAppConfig);
        }
      });
  }, [user]);

  // Load contact data using phone number
  useEffect(() => {
    if (!user || !phone || !config) return;
    supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('config_id', config.id)
      .eq('phone_number', phone)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setContact(data as WhatsAppContact);
        } else {
          // Create fallback contact if not found
          setContact({
            id: '',
            config_id: config.id,
            wa_id: phone,
            profile_name: phone,
            phone_number: phone,
            last_message_at: '',
            total_messages: 0,
          });
        }
        setLoading(false);
      });
  }, [user, phone, config]);

  if (loading || !contact) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
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
          <ContactAvatar name={contact.profile_name} profilePictureUrl={undefined} size={100} />
          <Text style={styles.contactName}>{contact.profile_name}</Text>
          <Text style={styles.contactPhone}>{contact.phone_number}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Messages</Text>
          <Text style={styles.cardValue}>{contact.total_messages || 0} messages</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total Calls</Text>
          <Text style={styles.cardValue}>0 calls</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Last Message</Text>
          <Text style={styles.cardValue}>
            {contact.last_message_at
              ? new Date(contact.last_message_at).toLocaleDateString()
              : 'No messages yet'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Created</Text>
          <Text style={styles.cardValue}>
            {contact.created_at
              ? new Date(contact.created_at).toLocaleDateString()
              : 'Unknown'}
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
            <Text style={styles.actionText}>Block {contact.profile_name}</Text>
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity style={styles.actionRow}>
            <Text style={styles.actionIcon}>⚠️</Text>
            <Text style={[styles.actionText, styles.dangerText]}>Report {contact.profile_name}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1a' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#111827', 
    paddingTop: Platform.OS === 'ios' ? 56 : 16, 
    paddingBottom: 14, 
    paddingHorizontal: 14, 
    gap: 12 
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: '#ffffff' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff' },
  scroll: { flex: 1 },
  profileSection: { 
    alignItems: 'center', 
    backgroundColor: '#111827', 
    paddingTop: 32, 
    paddingBottom: 28, 
    gap: 10, 
    marginBottom: 8 
  },
  contactName: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginTop: 8 },
  contactPhone: { fontSize: 16, color: '#8696a0' },
  card: { 
    backgroundColor: '#111827', 
    marginBottom: 8, 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    gap: 10 
  },
  cardLabel: { 
    fontSize: 13, 
    color: '#00d4aa', 
    fontWeight: '600', 
    textTransform: 'uppercase', 
    letterSpacing: 0.8 
  },
  cardValue: { fontSize: 15, color: '#ffffff', lineHeight: 20 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  mediaPlaceholder: { 
    width: '31%' as any, 
    aspectRatio: 1, 
    backgroundColor: '#1f2c34', 
    borderRadius: 6 
  },
  emptySection: { paddingVertical: 12 },
  emptySectionText: { color: '#8696a0', fontSize: 14, textAlign: 'center' },
  actionsCard: { backgroundColor: '#111827', marginBottom: 8 },
  actionRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    gap: 16 
  },
  actionIcon: { fontSize: 20 },
  actionText: { fontSize: 16, color: '#ffffff' },
  dangerText: { color: '#ef4444' },
  actionDivider: { 
    height: StyleSheet.hairlineWidth, 
    backgroundColor: '#2d3748', 
    marginLeft: 56 
  },
});