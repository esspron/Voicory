import { colors as C } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as haptics from '../lib/haptics';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CallCard } from '../components/CallCard';
import { StatusBadge } from '../components/StatusBadge';
import { getCustomerById, updateCustomer } from '../services/customerService';
import { getCalls } from '../services/callService';
import { Customer, CallLog } from '../types';


const TAGS = ['hot_lead', 'follow_up', 'closed', 'vip', 'new'];

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'calls' | 'notes'>('calls');
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const customerData = await getCustomerById(id);
      setCustomer(customerData);
      setNotes(customerData?.variables?.notes || '');

      // Load calls for this customer by matching phone_number
      // Since there's no customer_id in call_logs, we match by phone number
      const { data: callsRaw } = await (async () => {
        const supabase = (await import('../lib/supabase')).supabase;
        return supabase
          .from('call_logs')
          .select('*, assistant:assistant_id(name)')
          .eq('phone_number', customerData?.phone_number)
          .order('created_at', { ascending: false })
          .limit(50);
      })();
      setCalls((callsRaw as CallLog[]) || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load customer');
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handleSaveNotes = async () => {
    if (!customer) return;
    setSavingNotes(true);
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
    const currentTags: string[] = customer.variables?.tags || [];
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (error || !customer) {
    return (
      <View style={styles.centered}>
        <Ionicons name="warning-outline" size={40} color={C.danger} />
        <Text style={styles.errorText}>{error || 'Customer not found'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentTags: string[] = customer.variables?.tags || [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName} numberOfLines={1}>{customer.name}</Text>
          <Text style={styles.headerPhone}>{customer.phone_number}</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actions}>
        <ActionButton
          icon="call"
          label="Call"
          color={C.primary}
          onPress={() => Linking.openURL(`tel:${customer.phone_number}`)}
        />
        <ActionButton
          icon="logo-whatsapp"
          label="WhatsApp"
          color={C.success}
          onPress={() =>
            Linking.openURL(`https://wa.me/${customer.phone_number.replace(/\D/g, '')}`)
          }
        />
        <ActionButton
          icon="create-outline"
          label="Edit"
          color={C.secondary}
          onPress={() => router.push(`/customers/${customer.id}/edit` as any)}
        />
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        {customer.email && (
          <InfoRow icon="mail-outline" label="Email" value={customer.email} />
        )}
        {customer.source && (
          <InfoRow icon="git-branch-outline" label="Source" value={customer.source} />
        )}
        <InfoRow icon="calendar-outline" label="Created" value={formatDate(customer.created_at)} />
        <InfoRow icon="time-outline" label="Last Contact" value={formatDate(customer.last_interaction)} />
      </View>

      {/* Tags */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tagsScroll}
        contentContainerStyle={styles.tagsContent}
      >
        {TAGS.map((tag) => {
          const active = currentTags.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, active && styles.tagActive]}
              onPress={() => toggleTag(tag)}
            >
              <Text style={[styles.tagText, active && styles.tagTextActive]}>
                {tag.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'calls' && styles.tabActive]}
          onPress={() => setActiveTab('calls')}
        >
          <Text style={[styles.tabText, activeTab === 'calls' && styles.tabTextActive]}>
            Calls ({calls.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notes' && styles.tabActive]}
          onPress={() => setActiveTab('notes')}
        >
          <Text style={[styles.tabText, activeTab === 'notes' && styles.tabTextActive]}>Notes</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'calls' ? (
        <FlatList
          data={calls}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CallCard
              call={item}
              onPress={(call) => router.push(`/calls/${call.id}` as any)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyTab}>
              <Text style={styles.emptyText}>No calls with this customer yet.</Text>
            </View>
          }
          contentContainerStyle={styles.callsList}
        />
      ) : (
        <View style={styles.notesSection}>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Write notes about this customer..."
            placeholderTextColor={C.textMuted}
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.saveBtn, savingNotes && { opacity: 0.6 }]}
            onPress={handleSaveNotes}
            disabled={savingNotes}
          >
            <Text style={styles.saveBtnText}>
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: any;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.actionIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={C.textMuted} style={{ marginRight: 8 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, gap: 12 },
  errorText: { color: C.danger, fontSize: 15 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: C.surfaceRaised, borderRadius: 8 },
  backBtnText: { color: C.text, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: { color: C.text, fontSize: 18, fontWeight: '700' },
  headerPhone: { color: C.textMuted, fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 12 },
  actionBtn: { flex: 1, alignItems: 'center', gap: 6 },
  actionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: C.textMuted, fontSize: 12 },
  infoCard: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { color: C.textMuted, fontSize: 13, flex: 1 },
  infoValue: { color: C.text, fontSize: 13, fontWeight: '500', flex: 2, textAlign: 'right' },
  tagsScroll: { maxHeight: 48, marginBottom: 8 },
  tagsContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  tagActive: { backgroundColor: C.primaryMuted, borderColor: C.primary },
  tagText: { color: C.textMuted, fontSize: 12, textTransform: 'capitalize' },
  tagTextActive: { color: C.primary, fontWeight: '600' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: C.surface, borderRadius: 8, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: C.surfaceRaised },
  tabText: { color: C.textMuted, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: C.text, fontWeight: '600' },
  callsList: { paddingBottom: 32 },
  emptyTab: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { color: C.textMuted, fontSize: 14 },
  notesSection: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  notesInput: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    color: C.text,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 160,
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  saveBtnText: { color: C.bg, fontSize: 15, fontWeight: '700' },
});
