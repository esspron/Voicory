import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, StatusBar, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ContactAvatar from '../components/whatsapp/ContactAvatar';

interface WAContact {
  id: string;
  config_id: string;
  profile_name: string;
  phone_number: string;
  last_message_at: string;
  total_messages: number;
  created_at: string;
}

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'numeric' });
}

export default function WhatsAppScreen() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<WAContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<TextInput>(null);

  const loadContacts = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      // First get user's whatsapp config
      const { data: configs } = await supabase
        .from('whatsapp_configs')
        .select('id')
        .eq('user_id', user.id);

      if (!configs?.length) {
        setContacts([]);
        return;
      }

      const configIds = configs.map(c => c.id);
      const { data, error: fetchError } = await supabase
        .from('whatsapp_contacts')
        .select('*')
        .in('config_id', configIds)
        .order('last_message_at', { ascending: false });

      if (fetchError) throw fetchError;
      setContacts((data ?? []) as WAContact[]);
    } catch (e: any) {
      setError(e.message || 'Failed to load conversations');
    }
  }, [user]);

  useEffect(() => {
    loadContacts().finally(() => setLoading(false));
  }, [loadContacts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  }, [loadContacts]);

  const filtered = searchQuery
    ? contacts.filter(c =>
        (c.profile_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone_number.includes(searchQuery))
    : contacts;

  const handlePress = (contact: WAContact) => {
    router.push(`/chat/${encodeURIComponent(contact.phone_number)}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>WhatsApp</Text>
        <TouchableOpacity onPress={() => { setSearchVisible(v => !v); if (!searchVisible) setTimeout(() => searchRef.current?.focus(), 100); else setSearchQuery(''); }} style={styles.headerIcon}>
          <Text style={{ fontSize: 20 }}>🔍</Text>
        </TouchableOpacity>
      </View>

      {searchVisible && (
        <View style={styles.searchBar}>
          <TextInput ref={searchRef} style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search..." placeholderTextColor="#8696a0" />
        </View>
      )}

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#00d4aa" /></View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadContacts} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => handlePress(item)} activeOpacity={0.7}>
              <ContactAvatar name={item.profile_name || item.phone_number} size={50} />
              <View style={styles.rowContent}>
                <View style={styles.rowTop}>
                  <Text style={styles.contactName} numberOfLines={1}>{item.profile_name || item.phone_number}</Text>
                  <Text style={styles.timeLabel}>{formatTime(item.last_message_at)}</Text>
                </View>
                <Text style={styles.previewText} numberOfLines={1}>
                  {item.total_messages ? `${item.total_messages} messages` : 'No messages yet'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d4aa" colors={['#00d4aa']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 56 }}>💬</Text>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>Connect your WhatsApp Business number to start.</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={filtered.length === 0 ? { flexGrow: 1 } : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111827', paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 14, paddingHorizontal: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  headerIcon: { padding: 4 },
  searchBar: { backgroundColor: '#111827', paddingHorizontal: 16, paddingBottom: 12 },
  searchInput: { backgroundColor: '#1f2c34', color: '#ffffff', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 8, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 14 },
  rowContent: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contactName: { fontSize: 16, fontWeight: '600', color: '#ffffff', flex: 1, marginRight: 8 },
  timeLabel: { fontSize: 12, color: '#8696a0' },
  previewText: { fontSize: 14, color: '#8696a0' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#1f2c34', marginLeft: 80 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: '#ef4444', fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: { backgroundColor: '#00d4aa', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  emptyContainer: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  emptySubtitle: { fontSize: 14, color: '#8696a0', textAlign: 'center', lineHeight: 20 },
});
