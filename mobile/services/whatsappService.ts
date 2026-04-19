/**
 * whatsappService — WhatsApp Business message data access layer.
 * Fetches conversation lists and message history from Supabase.
 * Sends messages via the Voicory backend API.
 */
import { supabase } from '../lib/supabase';
import { authFetch } from '../lib/api';

export interface WAContact {
  id: string;
  config_id: string;
  wa_id: string;
  profile_name: string;
  phone_number: string;
  customer_id?: string;
  is_opted_in: boolean;
  last_message_at: string;
  total_messages: number;
  total_calls: number;
  created_at: string;
  updated_at: string;
  lastMessage?: WAMessage;
}

export interface WAMessage {
  id: string;
  wa_message_id: string;
  config_id: string;
  from_number: string;
  to_number: string;
  direction: 'inbound' | 'outbound';
  message_type: string;
  content: string;
  status: string;
  is_from_bot: boolean;
  assistant_id?: string;
  message_timestamp: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
  customer_id?: string;
}

export const getConversations = async (configId: string): Promise<WAContact[]> => {
  const { data, error } = await supabase
    .from('whatsapp_contacts')
    .select('*')
    .eq('config_id', configId)
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as WAContact[];
};

export const getMessages = async (
  configId: string,
  phoneNumber: string,
  limit = 50,
): Promise<WAMessage[]> => {
  // Messages where this phone is either sender or recipient
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('config_id', configId)
    .or(`from_number.eq.${phoneNumber},to_number.eq.${phoneNumber}`)
    .order('message_timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as WAMessage[];
};

export const sendMessage = async (
  contactPhone: string,
  text: string,
): Promise<void> => {
  const response = await authFetch('/api/whatsapp/send', {
    method: 'POST',
    body: JSON.stringify({ to: contactPhone, message: text }),
  });
  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Send failed: ${errBody}`);
  }
};

export const markAsRead = async (
  configId: string,
  contactId: string,
): Promise<void> => {
  // No unread_count column — just update last read timestamp
  await supabase
    .from('whatsapp_contacts')
    .update({ updated_at: new Date().toISOString() })
    .eq('config_id', configId)
    .eq('id', contactId);
};
