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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { colors as C, radii, spacing } from '../lib/theme';
import ContactAvatar from '../components/whatsapp/ContactAvatar';

interface WhatsAppConfig {
  id: string;
  user_id: string;
  display_phone_number: string;
  display_name: string;
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

interface ActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  color?: string;
}

function ActionButton({ icon, label, onPress, color = C.primary }: ActionButtonProps) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.actionBtnIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.actionBtnLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

function InfoRow({ label, value, icon }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      {icon && (
        <View style={styles.infoIcon}>
          <Ionicons name={icon} size={18} color={C.textMuted} />
        </View>
      )}
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function formatDate(iso?: string): string {
  if (!iso) return 'Unknown';
  return new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ContactInfoScreen() {
  const { user } = useAuth();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const insets = useSafeAreaInsets();

  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [contact, setContact] = useState<WhatsAppContact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('whatsapp_configs')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (data && !error) setConfig(data as WhatsAppConfig);
      });
  }, [user]);

  useEffect(() => {
    if (!user || !phone || !config) return;
    supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('config_id', config.id)
      .eq('phone_number', phone)
      .single()
      .then(({ data, error }) => {
        setContact(
          (data as WhatsAppContact) ?? {
            id: '',
            config_id: config.id,
            wa_id: phone,
            profile_name: phone,
            phone_number: phone,
            last_message_at: '',
            total_messages: 0,
          },
        );
        setLoading(false);
      });
  }, [user, phone, config]);

  if (loading || !contact) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar barStyle="light-content" backgroundColor={C.surface} />
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const name = contact.profile_name || contact.phone_number;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.surface} />

      {/* Header bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Contact Info</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <ContactAvatar name={name} size={96} />
          <Text style={styles.heroName}>{name}</Text>
          <Text style={styles.heroPhone}>{contact.phone_number}</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <ActionButton icon="chatbubble-outline" label="Message" onPress={() => router.back()} />
          <ActionButton icon="call-outline" label="Call" color={C.secondary} />
          <ActionButton icon="mail-outline" label="Email" color="#f59e0b" />
        </View>

        {/* Stats section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.card}>
            <InfoRow
              icon="chatbubbles-outline"
              label="Total Messages"
              value={`${contact.total_messages || 0} messages`}
            />
            <View style={styles.rowDivider} />
            <InfoRow
              icon="time-outline"
              label="Last Message"
              value={formatDate(contact.last_message_at)}
            />
            <View style={styles.rowDivider} />
            <InfoRow
              icon="person-add-outline"
              label="Contact Since"
              value={formatDate(contact.created_at)}
            />
          </View>
        </View>

        {/* Media section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Media, Links & Docs</Text>
          <View style={styles.card}>
            <View style={styles.mediaGrid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View key={i} style={styles.mediaPlaceholder} />
              ))}
            </View>
          </View>
        </View>

        {/* Danger actions */}
        <View style={styles.section}>
          <View style={styles.card}>
            <TouchableOpacity style={styles.dangerRow} activeOpacity={0.7}>
              <Ionicons name="ban-outline" size={20} color={C.danger} />
              <Text style={styles.dangerText}>Block {name}</Text>
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.dangerRow} activeOpacity={0.7}>
              <Ionicons name="warning-outline" size={20} color={C.danger} />
              <Text style={styles.dangerText}>Report {name}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    paddingTop: 8,
    paddingBottom: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { padding: 4, width: 40 },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Hero
  hero: {
    alignItems: 'center',
    backgroundColor: C.surface,
    paddingTop: 36,
    paddingBottom: 28,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 16,
  },
  heroName: { fontSize: 24, fontWeight: '800', color: C.text, marginTop: 8, letterSpacing: -0.3 },
  heroPhone: { fontSize: 15, color: C.textMuted, fontWeight: '500' },

  // Action buttons row
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  actionBtnIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Section
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  infoIcon: { width: 24, alignItems: 'center' },
  infoText: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  infoValue: { fontSize: 15, color: C.text, fontWeight: '500' },
  rowDivider: { height: 1, backgroundColor: C.border, marginLeft: 54 },

  // Media
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 8 },
  mediaPlaceholder: {
    width: '31%' as unknown as number,
    aspectRatio: 1,
    backgroundColor: C.surfaceElevated,
    borderRadius: radii.sm,
  },

  // Danger
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  dangerText: { fontSize: 16, color: C.danger, fontWeight: '500' },
});
