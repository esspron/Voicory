import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { colors as C } from '../lib/theme';
import ChatBubble from '../components/whatsapp/ChatBubble';
import ChatInput from '../components/whatsapp/ChatInput';
import ContactAvatar from '../components/whatsapp/ContactAvatar';
import DateDivider from '../components/whatsapp/DateDivider';
import TypingIndicator from '../components/whatsapp/TypingIndicator';
import { Ionicons } from '@expo/vector-icons';

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
}

interface WhatsAppMessage {
  id: string;
  wa_message_id: string;
  config_id: string;
  from_number: string;
  to_number: string;
  direction: 'inbound' | 'outbound';
  message_type: 'text' | 'image' | 'audio' | 'document' | 'template';
  content: unknown;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  is_from_bot: boolean;
  message_timestamp: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateLabel(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86400000,
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

function getMessageText(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  const c = content as Record<string, unknown>;
  if (c.text && typeof c.text === 'object') {
    const t = c.text as Record<string, unknown>;
    if (typeof t.body === 'string') return t.body;
  }
  if (typeof c.body === 'string') return c.body;
  return '';
}

type ListItem =
  | { type: 'message'; message: WhatsAppMessage; showTail: boolean }
  | { type: 'divider'; label: string; key: string };

function buildListItems(messages: WhatsAppMessage[]): ListItem[] {
  const sorted = [...messages].sort(
    (a, b) => new Date(a.message_timestamp).getTime() - new Date(b.message_timestamp).getTime(),
  );

  const items: ListItem[] = [];
  let lastDateLabel = '';
  let lastSender: string | null = null;
  let lastSenderTime: Date | null = null;

  for (const msg of sorted) {
    const dateLabel = getDateLabel(msg.message_timestamp);

    if (dateLabel !== lastDateLabel) {
      items.push({ type: 'divider', label: dateLabel, key: `divider-${msg.id}` });
      lastDateLabel = dateLabel;
      lastSender = null;
      lastSenderTime = null;
    }

    const msgTime = new Date(msg.message_timestamp);
    const isGrouped =
      lastSender === msg.direction &&
      lastSenderTime !== null &&
      msgTime.getTime() - lastSenderTime.getTime() < 60000;

    items.push({ type: 'message', message: msg, showTail: !isGrouped });
    lastSender = msg.direction;
    lastSenderTime = msgTime;
  }

  return items.reverse();
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { user } = useAuth();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const insets = useSafeAreaInsets();

  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [contact, setContact] = useState<WhatsAppContact | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isTyping] = useState(false); // Can wire to presence/bot typing state later
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('whatsapp_configs')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error: e }) => {
        if (data && !e) setConfig(data as WhatsAppConfig);
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
      .then(({ data }) => {
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
      });
  }, [user, phone, config]);

  const loadMessages = useCallback(async () => {
    if (!user || !phone || !config) return;
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('config_id', config.id)
        .or(`from_number.eq.${phone},to_number.eq.${phone}`)
        .order('message_timestamp', { ascending: false })
        .limit(100);
      if (fetchError) throw fetchError;
      setMessages(data || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load messages';
      setError(msg);
    }
  }, [user, phone, config]);

  useEffect(() => {
    loadMessages().finally(() => setLoading(false));
  }, [loadMessages]);

  // Realtime
  useEffect(() => {
    if (!user || !phone || !config) return;
    const channel = supabase
      .channel(`whatsapp-chat-${phone}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `config_id=eq.${config.id}` },
        (payload) => {
          const newMsg = payload.new as WhatsAppMessage;
          if (newMsg.from_number === phone || newMsg.to_number === phone) {
            setMessages((prev) => [newMsg, ...prev]);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, phone, config]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!user || !phone || !config) return;
      setSending(true);

      const tempMsg: WhatsAppMessage = {
        id: `temp-${Date.now()}`,
        wa_message_id: `temp-${Date.now()}`,
        config_id: config.id,
        from_number: config.display_phone_number,
        to_number: phone,
        direction: 'outbound',
        message_type: 'text',
        content: { text: { body: text } },
        status: 'sent',
        is_from_bot: false,
        message_timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [tempMsg, ...prev]);

      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/whatsapp/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config_id: config.id, to: phone, message: text }),
        });
        if (!response.ok) throw new Error('Failed to send message');
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMsg.id ? { ...m, status: 'failed' as const } : m)),
        );
      } finally {
        setSending(false);
      }
    },
    [user, phone, config],
  );

  const listItems = useMemo(() => buildListItems(messages), [messages]);

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'divider') return <DateDivider label={item.label} />;
    return (
      <ChatBubble
        message={item.message}
        showTail={item.showTail}
        onImagePress={setLightboxUrl}
      />
    );
  };

  const keyExtractor = (item: ListItem) =>
    item.type === 'divider' ? item.key : item.message.id;

  const contactName = contact?.profile_name ?? phone ?? 'Unknown';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => router.push(`/contact/${encodeURIComponent(phone ?? '')}`)}
          activeOpacity={0.8}
        >
          <ContactAvatar name={contactName} size={38} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{contactName}</Text>
            <Text style={styles.headerStatus}>
              {isTyping ? 'typing...' : 'tap for info'}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7}>
            <Ionicons name="call-outline" size={20} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={20} color={C.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat + Input */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.chatBg}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={C.primary} />
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
              ListHeaderComponent={isTyping ? <TypingIndicator /> : null}
              ListEmptyComponent={
                <View style={styles.emptyChat}>
                  <Text style={styles.emptyChatText}>No messages yet. Say hello! 👋</Text>
                </View>
              }
            />
          )}
        </View>
        <ChatInput onSend={handleSend} disabled={sending} />
      </KeyboardAvoidingView>

      {/* Lightbox */}
      <Modal visible={!!lightboxUrl} transparent animationType="fade">
        <View style={styles.lightbox}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxUrl(null)}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          {lightboxUrl && (
            <Image source={{ uri: lightboxUrl }} style={styles.lightboxImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.surface },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    paddingBottom: 10,
    paddingTop: 8,
    paddingHorizontal: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { padding: 4 },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerInfo: { flex: 1, gap: 2 },
  headerName: { fontSize: 16, fontWeight: '700', color: C.text },
  headerStatus: { fontSize: 12, color: C.textMuted },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerActionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  chatBg: { flex: 1, backgroundColor: '#0b141a' },
  messageList: { paddingVertical: 10, paddingBottom: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: C.danger, fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: { backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#000', fontWeight: '700', fontSize: 15 },
  emptyChat: { alignItems: 'center', paddingVertical: 40 },
  emptyChatText: { color: C.textMuted, fontSize: 14 },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  lightboxClose: { position: 'absolute', top: 56, right: 20, padding: 8, zIndex: 10 },
  lightboxImage: { width: '100%', height: '80%' },
});
