import { supabase } from '../lib/supabase';
import { authFetch } from '../lib/api';
import { WhatsAppContact, WhatsAppMessage } from '../types/whatsapp';

export const getConversations = async (userId: string): Promise<WhatsAppContact[]> => {
  const { data, error } = await supabase
    .from('whatsapp_contacts')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false });

  if (error) throw error;

  // For each contact, fetch last message
  const contacts = data as WhatsAppContact[];
  const withLastMessage = await Promise.all(
    contacts.map(async (contact) => {
      const { data: msgs } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('user_id', userId)
        .eq('contact_phone', contact.phone)
        .order('timestamp', { ascending: false })
        .limit(1);
      return { ...contact, lastMessage: msgs?.[0] as WhatsAppMessage | undefined };
    }),
  );

  return withLastMessage;
};

export const getMessages = async (
  userId: string,
  contactPhone: string,
  limit = 50,
): Promise<WhatsAppMessage[]> => {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('user_id', userId)
    .eq('contact_phone', contactPhone)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as WhatsAppMessage[];
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
  userId: string,
  contactPhone: string,
): Promise<void> => {
  await supabase
    .from('whatsapp_contacts')
    .update({ unread_count: 0 })
    .eq('user_id', userId)
    .eq('phone', contactPhone);
};
