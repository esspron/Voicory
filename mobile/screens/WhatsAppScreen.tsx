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
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getConversations } from '../services/whatsappService';
import { WhatsAppContact, WhatsAppMessage } from '../types/whatsapp';
import ContactAvatar from '../components/whatsapp/ContactAvatar';
import UnreadBadge from '../components/whatsapp/UnreadBadge';
import MessageStatus from '../components/whatsapp/MessageStatus';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatConversationTime(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { day: 'numeric', month: 'numeric' });
}

function getLastMessagePreview(contact: WhatsAppContact): string {
  const msg = contact.lastMessage;
  if (!msg) return '';
  if (msg.message_type === 'image') return '📷 Photo';
  if (msg.message_type === 'audio') return '🎤 Voice message';
  if (msg.message_type === 'document') return '📄 Document';
  return msg.body || '';
}

// ─── Row component ────────────────────────────────────────────────────────────

interface ConversationRowProps {
  contact: WhatsAppContact;
  onPress: (contact: WhatsAppContact) => void;
}

const ConversationRow = React.memo(({ contact, onPress }: ConversationRowProps) => {
  const preview = getLastMessagePreview(contact);
  const timeLabel = formatConversationTime(contact.last_message_at);
  const isOutgoing = contact.lastMessage?.direction === 'outbound';

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(contact)} activeOpacity={0.7}>
      <ContactAvatar name={contact.name} profilePictureUrl={contact.profile_picture_url} size={50} />
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
          <Text style={[styles.timeLabel, contact.unread_count > 0 && styles.timeLabelUnread]}>
            {timeLabel}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <View style={styles.previewRow}>
            {isOutgoing && contact.lastMessage && (
              <View style={styles.statusInPreview}>
                <MessageStatus status={contact.lastMessage.status} size={13} />
              </View>
            )}
            <Text style={styles.previewText} numberOfLines={1}>
              {preview}
            </Text>
          </View>
          <UnreadBadge count={contact.unread_count} />
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

interface Props {
  navigation: any;
}

export default function WhatsAppScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
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
      const data = await getConversations(user.id);
      setContacts(data);
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

  const handleSearchToggle = () => {
    setSearchVisible((v) => !v);
    if (!searchVisible) {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
    }
  };

  const filteredContacts = searchQuery
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone.includes(searchQuery),
      )
    : contacts;

  const handleContactPress = (contact: WhatsAppContact) => {
    navigation.navigate('ChatScreen', { contact });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>WhatsApp</Text>
        <TouchableOpacity onPress={handleSearchToggle} style={styles.headerIcon}>
          <Text style={styles.headerIconText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      {searchVisible && (
        <View style={styles.searchBar}>
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search conversations..."
            placeholderTextColor="#8696a0"
            returnKeyType="search"
          />
          <TouchableOpacity onPress={handleSearchToggle} style={styles.searchCancel}>
            <Text style={styles.searchCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00d4aa" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadContacts} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationRow contact={item} onPress={handleContactPress} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00d4aa"
              colors={['#00d4aa']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'No results for your search.'
                  : 'No WhatsApp conversations yet. Connect your WhatsApp Business number to start.'}
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={filteredContacts.length === 0 ? styles.emptyList : undefined}
        />
      )}
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
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  headerIcon: {
    padding: 4,
  },
  headerIconText: {
    fontSize: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1f2c34',
    color: '#ffffff',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
  },
  searchCancel: {
    paddingVertical: 6,
  },
  searchCancelText: {
    color: '#00d4aa',
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0a0f1a',
    gap: 14,
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  timeLabel: {
    fontSize: 12,
    color: '#8696a0',
  },
  timeLabelUnread: {
    color: '#25d366',
    fontWeight: '600',
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 4,
  },
  statusInPreview: {
    marginTop: 1,
  },
  previewText: {
    flex: 1,
    fontSize: 14,
    color: '#8696a0',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#1f2c34',
    marginLeft: 80,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryBtn: {
    backgroundColor: '#00d4aa',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8696a0',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyList: {
    flexGrow: 1,
  },
});
