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
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ChatBubble from '../components/whatsapp/ChatBubble';
import ChatInput from '../components/whatsapp/ChatInput';
import ContactAvatar from '../components/whatsapp/ContactAvatar';
import { Ionicons } from '@expo/vector-icons';
import DateDivider from '../components/whatsapp/DateDivider';

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
  message_type: string;
  content: any; // JSONB field
  status: string;
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
      (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

// Extract text from content JSONB field - handle both {text: {body: "..."}} and {body: "..."} formats
function getMessageText(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (content.text?.body) return content.text.body;
  if (content.body) return content.body;
  return '';
}

// Build flat list items: messages with injected date dividers
type ListItem =
  | { type: 'message'; message: WhatsAppMessage; showTail: boolean }
  | { type: 'divider'; label: string; key: string };

function buildListItems(messages: WhatsAppMessage[]): ListItem[] {
  // messages sorted newest-first (FlatList inverted); process in reading order
  const sorted = [...messages].sort(
    (a, b) => new Date(a.message_timestamp).getTime() - new Date(b.message_timestamp).getTime(),
  );

  const items: ListItem[] = [];
  let lastDateLabel = '';
  let lastSender: string | null = null;
  let lastSenderTime: Date | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const msg = sorted[i];
    const dateLabel = getDateLabel(msg.message_timestamp);

    if (dateLabel !== lastDateLabel) {
      items.push({ type: 'divider', label: dateLabel, key: `divider-${msg.id}` });
      lastDateLabel = dateLabel;
      lastSender = null;
      lastSenderTime = null;
    }

    // Show tail if: different sender OR same sender but >1 min gap
    const msgTime = new Date(msg.message_timestamp);
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

export default function ChatScreen() {
  const { user } = useAuth();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [contact, setContact] = useState<WhatsAppContact | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // ── Load user's WhatsApp config ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase
      .from('whatsapp_configs')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setConfig(data as WhatsAppConfig);
        }
      });
  }, [user]);

  // ── Load contact from phone ────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !phone || !config) return;
    supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('config_id', config.id)
      .eq('phone_number', phone)
      .single()
      .then(({ data }) => {
        if (data) {
          setContact(data as WhatsAppContact);
        } else {
          // Create a fallback contact object if not found in DB
          setContact({
            id: '',
            config_id: config.id,
            wa_id: phone,
            profile_name: phone,
            phone_number: phone,
            last_message_at: '',
            total_messages: 0,
          });
        }
      });
  }, [user, phone, config]);

  // ── Load messages ──────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!user || !phone || !config) return;
    try {
      setError(null);
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('config_id', config.id)
        .or(`from_number.eq.${phone},to_number.eq.${phone}`)
        .order('message_timestamp', { ascending: false })
        .limit(100);
        
      if (error) throw error;
      setMessages(data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load messages');
    }
  }, [user, phone, config]);

  useEffect(() => {
    loadMessages().finally(() => setLoading(false));
  }, [loadMessages]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !phone || !config) return;

    const channel = supabase
      .channel(`whatsapp-chat-${phone}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `config_id=eq.${config.id}`,
        },
        (payload) => {
          const newMsg = payload.new as WhatsAppMessage;
          if (newMsg.from_number === phone || newMsg.to_number === phone) {
            setMessages((prev) => [newMsg, ...prev]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, phone, config]);

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (text: string) => {
      if (!user || !phone || !config) return;
      setSending(true);

      // Optimistic update
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
        // Call backend API to send message
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/whatsapp/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config_id: config.id,
            to: phone,
            message: text,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to send message');
        }
      } catch (e: any) {
        // Mark temp message as failed
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMsg.id ? { ...m, status: 'failed' as const } : m)),
        );
      } finally {
        setSending(false);
      }
    },
    [user, phone, config],
  );

  // ── List data ────────────────────────────────────────────────────────────────
  const listItems = useMemo(() => buildListItems(messages), [messages]);

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'divider') {
      return <DateDivider label={item.label} />;
    }
    
    // Adapt message format for ChatBubble component
    const adaptedMessage = {
      ...item.message,
      body: getMessageText(item.message.content),
      timestamp: item.message.message_timestamp,
      media_url: undefined, // TODO: Extract from content if media message
    } as any; // Type override since ChatBubble expects old format
    
    return (
      <ChatBubble
        message={adaptedMessage}
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
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <ContactAvatar name={contact?.profile_name ?? phone ?? 'Unknown'} profilePictureUrl={undefined} size={38} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{contact?.profile_name ?? phone ?? 'Unknown'}</Text>
          <Text style={styles.headerStatus}>online</Text>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="call-outline" size={20} color="#fff" />
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
                  <Text style={styles.emptyChatText}>No messages yet. Say hello!</Text>
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
