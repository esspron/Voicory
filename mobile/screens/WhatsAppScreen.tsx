import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, StatusBar, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ContactAvatar from '../components/whatsapp/ContactAvatar';
import { EmptyState } from '../components/EmptyState';

// Design tokens
const C = {
  bg: '#050a12',
  surface: '#0c1219',
  surfaceRaised: '#111a24',
  border: '#1a2332',
  borderLight: '#1a233350',
  primary: '#00d4aa',
  primaryMuted: '#00d4aa18',
  secondary: '#0099ff',
  text: '#f0f2f5',
  textMuted: '#7a8599',
  textFaint: '#3d4a5c',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
};

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

  const toggleSearch = () => {
    setSearchVisible(v => !v);
    if (!searchVisible) {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.surface} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>WhatsApp</Text>
          {contacts.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{contacts.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={toggleSearch} style={styles.headerIcon}>
          <Ionicons name="search" size={24} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {searchVisible && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={C.textFaint} />
            <TextInput 
              ref={searchRef} 
              style={styles.searchInput} 
              value={searchQuery} 
              onChangeText={setSearchQuery} 
              placeholder="Search conversations..." 
              placeholderTextColor={C.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadContacts} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.conversationRow} 
              onPress={() => handlePress(item)} 
              activeOpacity={0.7}
            >
              <ContactAvatar name={item.profile_name || item.phone_number} size={48} />
              <View style={styles.conversationContent}>
                <View style={styles.conversationTop}>
                  <Text style={styles.contactName} numberOfLines={1}>
                    {item.profile_name || item.phone_number}
                  </Text>
                  <Text style={styles.timeLabel}>
                    {formatTime(item.last_message_at)}
                  </Text>
                </View>
                <Text style={styles.messagePreview} numberOfLines={1}>
                  {item.total_messages ? `${item.total_messages} messages` : 'No messages yet'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={C.primary} 
              colors={[C.primary]} 
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles"
              title="No conversations yet"
              message="Connect your WhatsApp Business number to start messaging customers."
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={filtered.length === 0 ? { flexGrow: 1 } : { paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: C.bg,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    justifyContent: 'space-between', 
    backgroundColor: C.surface, 
    paddingTop: Platform.OS === 'ios' ? 60 : 44, 
    paddingBottom: 20, 
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTitle: { 
    fontSize: 32,
    fontWeight: '800',
    color: C.text,
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: C.primaryMuted,
    borderColor: C.primary,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
  },
  headerIcon: { 
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    backgroundColor: C.surface,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceRaised,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
    gap: 12,
  },
  searchInput: { 
    flex: 1,
    color: C.text,
    fontSize: 16,
    fontWeight: '500',
  },
  conversationRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16,
    backgroundColor: C.bg,
  },
  conversationContent: { 
    flex: 1, 
    marginLeft: 16,
  },
  conversationTop: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  contactName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: C.text, 
    flex: 1, 
    marginRight: 12,
  },
  timeLabel: { 
    fontSize: 12, 
    color: C.textMuted,
    fontWeight: '500',
  },
  messagePreview: { 
    fontSize: 14, 
    color: C.textMuted,
    fontWeight: '500',
  },
  separator: { 
    height: 1, 
    backgroundColor: C.border, 
    marginLeft: 84,
  },
  centered: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: { 
    color: C.danger, 
    fontSize: 16, 
    textAlign: 'center',
    fontWeight: '500',
  },
  retryBtn: { 
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: 24, 
    paddingVertical: 12,
  },
  retryText: { 
    color: C.bg, 
    fontWeight: '600', 
    fontSize: 15,
  },
});
