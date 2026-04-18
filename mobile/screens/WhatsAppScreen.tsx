import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, StatusBar, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import ContactAvatar from '../components/whatsapp/ContactAvatar';
import { EmptyState } from '../components/EmptyState';

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
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.surface} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>WhatsApp</Text>
          <Text style={styles.subtitle}>Business conversations</Text>
        </View>
        <TouchableOpacity onPress={toggleSearch} style={styles.headerIcon}>
          <Ionicons name="search" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {searchVisible && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={theme.colors.textTertiary} />
            <TextInput 
              ref={searchRef} 
              style={styles.searchInput} 
              value={searchQuery} 
              onChangeText={setSearchQuery} 
              placeholder="Search conversations..." 
              placeholderTextColor={theme.colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
              tintColor={theme.colors.primary} 
              colors={[theme.colors.primary]} 
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
    backgroundColor: theme.colors.background,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    justifyContent: 'space-between', 
    backgroundColor: theme.colors.surface, 
    paddingTop: Platform.OS === 'ios' ? 60 : 20, 
    paddingBottom: 20, 
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { 
    fontSize: 32,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  headerIcon: { 
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    height: theme.input.height,
    gap: 12,
  },
  searchInput: { 
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.fontWeight.medium,
  },
  conversationRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16,
    backgroundColor: theme.colors.background,
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
    fontWeight: theme.fontWeight.semibold, 
    color: theme.colors.text, 
    flex: 1, 
    marginRight: 12,
  },
  timeLabel: { 
    fontSize: 12, 
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  messagePreview: { 
    fontSize: 14, 
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  separator: { 
    height: 1, 
    backgroundColor: theme.colors.border, 
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
    color: theme.colors.danger, 
    fontSize: 16, 
    textAlign: 'center',
    fontWeight: theme.fontWeight.medium,
  },
  retryBtn: { 
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 24, 
    paddingVertical: 12,
  },
  retryText: { 
    color: theme.colors.background, 
    fontWeight: theme.fontWeight.semibold, 
    fontSize: 15,
  },
});
