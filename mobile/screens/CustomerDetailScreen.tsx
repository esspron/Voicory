import { colors as C, typography, spacing, radii } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as haptics from '../lib/haptics';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  TextInput,
  Alert,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CallCard } from '../components/CallCard';
import { SkeletonCard, SkeletonListItem } from '../components/Skeleton';
import { getCustomerById, updateCustomer } from '../services/customerService';
import { Customer, CallLog } from '../types';

const TAGS = ['hot_lead', 'follow_up', 'closed', 'vip', 'new'];

const SOURCE_GRADIENTS: Record<string, [string, string]> = {
  inbound:  ['#00d4aa', '#0099ff'],
  outbound: ['#00d4aa', '#00b894'],
  whatsapp: ['#22c55e', '#16a34a'],
  vapi:     ['#a855f7', '#7c3aed'],
};

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

function getInitials(name?: string): string {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'calls' | 'notes'>('calls');
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslate = useRef(new Animated.Value(20)).current;

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const customerData = await getCustomerById(id);
      setCustomer(customerData);
      setNotes((customerData?.variables as Record<string, unknown> | undefined)?.notes as string || '');
      const { supabase } = await import('../lib/supabase');
      const { data: callsRaw } = await supabase
        .from('call_logs')
        .select('*, assistant:assistant_id(name)')
        .eq('phone_number', customerData?.phone_number)
        .order('created_at', { ascending: false })
        .limit(50);
      setCalls((callsRaw as CallLog[]) || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load customer');
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setSlowLoad(false);
    slowTimerRef.current = setTimeout(() => setSlowLoad(true), 10000);
    loadData().finally(() => {
      setLoading(false);
      setSlowLoad(false);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(heroTranslate, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }),
      ]).start();
    });
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [loadData]);

  const handleSaveNotes = async () => {
    if (!customer) return;
    setSavingNotes(true);
    haptics.lightTap();
    try {
      const updated = await updateCustomer(customer.id, {
        variables: { ...(customer.variables || {}), notes },
      });
      setCustomer(updated);
      Alert.alert('Saved', 'Notes saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const toggleTag = async (tag: string) => {
    if (!customer) return;
    haptics.selectionTap();
    const currentTags: string[] = ((customer.variables as Record<string, unknown> | undefined)?.tags as string[]) || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    try {
      const updated = await updateCustomer(customer.id, {
        variables: { ...(customer.variables || {}), tags: newTags },
      });
      setCustomer(updated);
    } catch {
      Alert.alert('Error', 'Failed to update tags.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Contact</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ paddingHorizontal: spacing.xl, paddingTop: 16 }}>
          <SkeletonCard style={{ marginBottom: spacing.lg }} />
          {Array.from({ length: 5 }).map((_, i) => <SkeletonListItem key={i} />)}
        </View>
        {slowLoad && (
          <View style={styles.slowLoadBanner}>
            <Ionicons name="time-outline" size={15} color={C.textMuted} />
            <Text style={styles.slowLoadText}>Taking longer than usual…</Text>
          </View>
        )}
      </View>
    );
  }

  if (error || !customer) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Ionicons name="warning-outline" size={40} color={C.danger} />
        <Text style={styles.errorText}>{error || 'Customer not found'}</Text>
        <TouchableOpacity onPress={loadData} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const gradColors = getGradient(customer.name, customer.source);
  const currentTags: string[] = ((customer.variables as Record<string, unknown> | undefined)?.tags as string[]) || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Contact</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/customers/${customer.id}/edit` as any)}
        >
          <Ionicons name="create-outline" size={20} color={C.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Hero section */}
        <Animated.View style={[styles.hero, { opacity: heroOpacity, transform: [{ translateY: heroTranslate }] }]}>
          {/* Large gradient avatar */}
          <View style={styles.heroAvatarWrap}>
            <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroAvatar}>
              <Text style={styles.heroInitials}>{getInitials(customer.name)}</Text>
            </LinearGradient>
            <View style={[styles.heroAvatarRing, { borderColor: gradColors[0] + '50' }]} />
          </View>

          <Text style={styles.heroName}>{customer.name || 'Unknown'}</Text>

          <Text style={styles.heroPhone}>{customer.phone_number}</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{customer.interaction_count}</Text>
              <Text style={styles.statLabel}>Interactions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{customer.source || '—'}</Text>
              <Text style={styles.statLabel}>Source</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatDate(customer.created_at)}</Text>
              <Text style={styles.statLabel}>Since</Text>
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <View style={styles.actions}>
          <ActionButton icon="call" label="Call" color={C.primary} onPress={() => {
            Alert.alert('Call via Voicory', 'To place AI-assisted calls, configure Twilio or Exotel in your Voicory dashboard at app.voicory.com/settings.', [
              { text: 'Open Settings', onPress: () => Linking.openURL('https://app.voicory.com/settings') },
              { text: 'OK', style: 'cancel' },
            ]);
          }} />
          <ActionButton icon="logo-whatsapp" label="WhatsApp" color={C.success} onPress={() => router.push(`/chat/${customer.phone_number.replace(/\D/g, '')}`)} />
          <ActionButton icon="create-outline" label="Edit" color={C.secondary} onPress={() => {}} />
          <ActionButton icon="create-outline" label="Edit" color="#a855f7" onPress={() => router.push(`/customers/${customer.id}/edit` as any)} />
        </View>

        {/* Tags section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Labels</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsRow}>
            {TAGS.map((tag) => {
              const active = currentTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tag, active && styles.tagActive]}
                  onPress={() => toggleTag(tag)}
                >
                  {active && <Ionicons name="checkmark" size={11} color={C.primary} style={{ marginRight: 4 }} />}
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>
                    {tag.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tabs */}
        <View style={styles.tabsWrap}>
          <View style={styles.tabs}>
            {(['calls', 'notes'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'calls' ? `Calls (${calls.length})` : 'Notes'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tab content */}
        {activeTab === 'calls' ? (
          <View style={styles.callsSection}>
            {calls.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="call-outline" size={32} color={C.textFaint} />
                <Text style={styles.emptyText}>No calls yet</Text>
              </View>
            ) : (
              calls.map((call) => (
                <CallCard
                  key={call.id}
                  call={call}
                  onPress={(c) => router.push(`/calls/${c.id}` as any)}
                />
              ))
            )}
          </View>
        ) : (
          <View style={styles.notesSection}>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Write notes about this customer..."
              placeholderTextColor={C.textFaint}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.saveBtn, savingNotes && { opacity: 0.6 }]}
              onPress={handleSaveNotes}
              disabled={savingNotes}
            >
              <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.saveBtnGradient}>
                <Text style={styles.saveBtnText}>{savingNotes ? 'Saving...' : 'Save Notes'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ActionButton({ icon, label, color, onPress }: { icon: any; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.actionIcon, { backgroundColor: color + '20', borderColor: color + '30', borderWidth: 1 }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, gap: 12 },
  errorText: { color: C.danger, fontSize: 15 },
  retryBtn: { paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, backgroundColor: C.primary, borderRadius: radii.md },
  retryBtnText: { color: C.bg, fontSize: 14, fontWeight: '700' },
  backBtn: { paddingHorizontal: spacing.xl, paddingVertical: 10, backgroundColor: C.surfaceRaised, borderRadius: radii.sm, borderWidth: 1, borderColor: C.border },
  backBtnText: { color: C.text, fontSize: 14 },
  slowLoadBanner: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  slowLoadText: { color: C.textMuted, fontSize: 13, fontWeight: '500' },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navTitle: { flex: 1, color: C.text, fontSize: 17, fontWeight: '600' },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: spacing.xxl,
  },
  heroAvatarWrap: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  heroAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarRing: {
    position: 'absolute',
    top: -5,
    left: -5,
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 2,
  },
  heroInitials: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroName: { color: C.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },
  heroEmail: { color: C.secondary, fontSize: 14, marginTop: 4 },
  heroPhone: { color: C.textSecondary, fontSize: 15, marginTop: 6, fontWeight: '500' },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    marginTop: 20,
    width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: C.text, fontSize: 15, fontWeight: '700' },
  statLabel: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: C.border },

  actions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginBottom: 20,
    gap: 8,
  },
  actionBtn: { flex: 1, alignItems: 'center', gap: 6 },
  actionIcon: { width: 48, height: 48, borderRadius: radii.xxl, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500' },

  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { color: C.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  tagsRow: { gap: 8, alignItems: 'center' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.xl,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  tagActive: { backgroundColor: C.primaryMuted, borderColor: C.primary + '60' },
  tagText: { color: C.textMuted, fontSize: 12, textTransform: 'capitalize' },
  tagTextActive: { color: C.primary, fontWeight: '600' },

  tabsWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  tabs: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: C.border },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radii.sm },
  tabActive: { backgroundColor: C.surfaceRaised },
  tabText: { color: C.textMuted, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: C.text, fontWeight: '700' },

  callsSection: { paddingHorizontal: 0 },
  emptyTab: { paddingVertical: 48, alignItems: 'center', gap: 10 },
  emptyText: { color: C.textMuted, fontSize: 14 },

  notesSection: { paddingHorizontal: spacing.lg },
  notesInput: {
    backgroundColor: C.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    color: C.text,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 160,
    marginBottom: 14,
  },
  saveBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: spacing.xxl },
  saveBtnGradient: { paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: C.bg, fontSize: 15, fontWeight: '700' },
});
