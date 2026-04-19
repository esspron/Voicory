import { colors as C, typography, spacing, radii } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ContactAvatar from '../components/whatsapp/ContactAvatar';
import UnreadBadge from '../components/whatsapp/UnreadBadge';
import MessageStatus from '../components/whatsapp/MessageStatus';
import { EmptyState } from '../components/EmptyState';
import { SkeletonListItem } from '../components/Skeleton';

interface WAContact {
  id: string;
  config_id: string;
  profile_name: string;
  phone_number: string;
  last_message_at: string;
  total_messages: number;
  unread_count?: number;
  last_message_text?: string;
  last_message_direction?: 'inbound' | 'outbound';
  last_message_status?: 'sent' | 'delivered' | 'read' | 'failed';
  created_at: string;
}

function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'numeric' });
}

interface ConversationRowProps {
  item: WAContact;
  onPress: () => void;
}

function ConversationRow({ item, onPress }: ConversationRowProps) {
  const isOnline = false; // Could wire to presence later
  const hasUnread = (item.unread_count ?? 0) > 0;
  const preview = item.last_message_text?.trim() || (item.total_messages ? 'Tap to view messages' : 'No messages yet');

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <ContactAvatar
        name={item.profile_name || item.phone_number}
        size={50}
        showOnline={isOnline}
      />
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.contactName, hasUnread && styles.contactNameUnread]} numberOfLines={1}>
            {item.profile_name || item.phone_number}
          </Text>
          <Text style={[styles.timeLabel, hasUnread && styles.timeLabelUnread]}>
            {formatRelativeTime(item.last_message_at)}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <View style={styles.previewRow}>
            {item.last_message_direction === 'outbound' && item.last_message_status && (
              <View style={styles.deliveryIcon}>
                <MessageStatus status={item.last_message_status} size={13} />
              </View>
            )}
            <Text
              style={[styles.messagePreview, hasUnread && styles.messagePreviewUnread]}
              numberOfLines={1}
            >
              {preview}
            </Text>
          </View>
          <UnreadBadge count={item.unread_count} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function WhatsAppScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<WAContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<TextInput>(null);
  const [slowLoad, setSlowLoad] = useState(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadContacts = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const { data: configs } = await supabase
        .from('whatsapp_configs')
        .select('id')
        .eq('user_id', user.id);

      if (!configs?.length) {
        setContacts([]);
        return;
      }

      const configIds = configs.map((c) => c.id);
      const { data, error: fetchError } = await supabase
        .from('whatsapp_contacts')
        .select('*')
        .in('config_id', configIds)
        .order('last_message_at', { ascending: false });

      if (fetchError) throw fetchError;
      setContacts((data ?? []) as WAContact[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load conversations';
      setError(msg);
    }
  }, [user]);

  useEffect(() => {
    setSlowLoad(false);
    slowTimerRef.current = setTimeout(() => setSlowLoad(true), 10000);
    loadContacts().finally(() => {
      setLoading(false);
      setSlowLoad(false);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    });
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [loadContacts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  }, [loadContacts]);

  const filtered = searchQuery
    ? contacts.filter(
        (c) =>
          (c.profile_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone_number.includes(searchQuery),
      )
    : contacts;

  const toggleSearch = () => {
    setSearchVisible((v) => !v);
    if (!searchVisible) {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
          <Ionicons name={searchVisible ? 'close' : 'search'} size={22} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      {searchVisible && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={C.textFaint} />
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
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
          {slowLoad && (
            <View style={styles.slowLoadBanner}>
              <Ionicons name="time-outline" size={15} color={C.textMuted} />
              <Text style={styles.slowLoadText}>Taking longer than usual…</Text>
            </View>
          )}
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="warning-outline" size={28} color={C.danger} />
          </View>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadContacts} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationRow
              item={item}
              onPress={() => router.push(`/chat/${encodeURIComponent(item.phone_number)}`)}
            />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: C.primaryMuted,
    borderColor: C.primary,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.xl,
    backgroundColor: C.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    backgroundColor: C.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceRaised,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    height: 42,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    fontWeight: '500',
  },
  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: C.bg,
  },
  rowContent: {
    flex: 1,
    marginLeft: 14,
    gap: 5,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  previewRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deliveryIcon: {
    marginTop: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    flex: 1,
    marginRight: 10,
  },
  contactNameUnread: {
    fontWeight: '700',
  },
  timeLabel: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '500',
  },
  timeLabelUnread: {
    color: C.primary,
    fontWeight: '700',
  },
  messagePreview: {
    fontSize: 14,
    color: C.textMuted,
    fontWeight: '400',
    flex: 1,
  },
  messagePreviewUnread: {
    color: C.text,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: C.border,
    marginLeft: 80,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  errorIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.danger + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.danger + '30',
  },
  errorText: {
    color: C.danger,
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryBtn: {
    backgroundColor: C.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  retryText: {
    color: C.bg,
    fontWeight: '600',
    fontSize: 15,
  },
  slowLoadBanner: {
    marginTop: spacing.md,
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
});
