import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getMessages, sendMessage, markAsRead } from '../services/whatsappService';
import { WhatsAppContact, WhatsAppMessage } from '../types/whatsapp';
import { supabase } from '../lib/supabase';
import ChatBubble from '../components/whatsapp/ChatBubble';
import ChatInput from '../components/whatsapp/ChatInput';
import ContactAvatar from '../components/whatsapp/ContactAvatar';
import DateDivider from '../components/whatsapp/DateDivider';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateLabel(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

// Build flat list items: messages with injected date dividers
type ListItem =
  | { type: 'message'; message: WhatsAppMessage; showTail: boolean }
  | { type: 'divider'; label: string; key: string };

function buildListItems(messages: WhatsAppMessage[]): ListItem[] {
  // messages sorted newest-first (FlatList inverted); process in reading order
  const sorted = [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const items: ListItem[] = [];
  let lastDateLabel = '';
  let lastSender: string | null = null;
  let lastSenderTime: Date | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const msg = sorted[i];
    const dateLabel = getDateLabel(msg.timestamp);

    if (dateLabel !== lastDateLabel) {
      items.push({ type: 'divider', label: dateLabel, key: `divider-${msg.id}` });
      lastDateLabel = dateLabel;
      lastSender = null;
      lastSenderTime = null;
    }

    // Show tail if: different sender OR same sender but >1 min gap
    const msgTime = new Date(msg.timestamp);
    const isGrouped =
      lastSender === msg.direction &&
      lastSenderTime !== null &&
      msgTime.getTime() - lastSenderTime.getTime() < 60 * 1000;

    items.push({ type: 'message', message: msg, showTail: !isGrouped });

    lastSender = msg.direction;
    lastSenderTime = msgTime;
  }

  // Reverse for inverted FlatList
  return items.reverse();
}

// ─── Screen ───────────────────────────────────────────────────────────────────

interface Props {
  phone?: string;
}

export default function ChatScreen({ phone: phoneProp }: Props) {
  const { user } = useAuth();

  const [contact, setContact] = useState<WhatsAppContact | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // ── Load contact from phone ────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !phoneProp) return;
    supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('user_id', user.id)
      .eq('phone', phoneProp)
      .single()
      .then(({ data }) => {
        if (data) {
          setContact(data as WhatsAppContact);
        } else {
          setContact({ id: '', user_id: user.id, phone: phoneProp, name: phoneProp, last_message_at: '', unread_count: 0, is_active: true, created_at: '', updated_at: '' });
        }
      });
  }, [user, phoneProp]);

  // ── Load messages ──────────────────────────────────────────────────────────
  const phone: string = contact?.phone ?? phoneProp ?? "";

  const loadMessages = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const data = await getMessages(user.id, phone);
      setMessages(data);
      await markAsRead(user.id, phone);
    } catch (e: any) {
      setError(e.message || 'Failed to load messages');
    }
  }, [user, phone]);

  useEffect(() => {
    loadMessages().finally(() => setLoading(false));
  }, [loadMessages]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`whatsapp-chat-${phone}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as WhatsAppMessage;
          if (newMsg.contact_phone === phone) {
            setMessages((prev) => [newMsg, ...prev]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, phone]);

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (text: string) => {
      if (!user) return;
      setSending(true);

      // Optimistic update
      const tempMsg: WhatsAppMessage = {
        id: `temp-${Date.now()}`,
        user_id: user.id,
        wa_message_id: `temp-${Date.now()}`,
        contact_phone: phone,
        contact_name: contact?.name ?? phone,
        direction: 'outbound',
        message_type: 'text',
        body: text,
        timestamp: new Date().toISOString(),
        status: 'sent',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [tempMsg, ...prev]);

      try {
        await sendMessage(phone, text);
      } catch (e: any) {
        // Mark temp message as failed
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMsg.id ? { ...m, status: 'failed' as const } : m)),
        );
      } finally {
        setSending(false);
      }
    },
    [user, contact],
  );

  // ── List data ────────────────────────────────────────────────────────────────
  const listItems = useMemo(() => buildListItems(messages), [messages]);

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'divider') {
      return <DateDivider label={item.label} />;
    }
    return (
      <ChatBubble
        message={item.message}
        showTail={item.showTail}
        onImagePress={setLightboxUrl}
      />
    );
  };

  const keyExtractor = (item: ListItem) => {
    if (item.type === 'divider') return item.key;
    return item.message.id;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <ContactAvatar name={contact?.name ?? phone} profilePictureUrl={contact?.profile_picture_url} size={38} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{contact?.name ?? phone}</Text>
          <Text style={styles.headerStatus}>online</Text>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <Text style={styles.headerActionIcon}>📞</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction}>
          <Text style={styles.headerActionIcon}>📹</Text>
        </TouchableOpacity>
      </View>

      {/* Chat area */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.chatBg}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#00d4aa" />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={loadMessages} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={listItems}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              inverted
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyChat}>
                  <Text style={styles.emptyChatText}>No messages yet. Say hello! 👋</Text>
                </View>
              }
            />
          )}
        </View>

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={sending} />
      </KeyboardAvoidingView>

      {/* Image lightbox */}
      <Modal visible={!!lightboxUrl} transparent animationType="fade">
        <View style={styles.lightbox}>
          <TouchableOpacity
            style={styles.lightboxClose}
            onPress={() => setLightboxUrl(null)}
          >
            <Text style={styles.lightboxCloseText}>✕</Text>
          </TouchableOpacity>
          {lightboxUrl && (
            <Image
              source={{ uri: lightboxUrl }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    paddingHorizontal: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2d3748',
  },
  backBtn: {
    padding: 4,
  },
  backIcon: {
    fontSize: 22,
    color: '#ffffff',
  },
  headerInfo: {
    flex: 1,
    gap: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerStatus: {
    fontSize: 12,
    color: '#25d366',
  },
  headerAction: {
    padding: 6,
  },
  headerActionIcon: {
    fontSize: 20,
  },
  chatBg: {
    flex: 1,
    backgroundColor: '#0b141a',
  },
  messageList: {
    paddingVertical: 8,
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
  emptyChat: {
    // inverted list — this shows at the bottom
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyChatText: {
    color: '#8696a0',
    fontSize: 14,
  },
  // Lightbox
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 20,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  lightboxCloseText: {
    color: '#ffffff',
    fontSize: 22,
  },
  lightboxImage: {
    width: '100%',
    height: '80%',
  },
});
