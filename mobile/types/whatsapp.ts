export interface WhatsAppContact {
  id: string;
  user_id: string;
  phone: string;
  name: string;
  profile_picture_url?: string;
  last_message_at: string;
  unread_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  lastMessage?: WhatsAppMessage;
}

export interface WhatsAppMessage {
  id: string;
  user_id: string;
  wa_message_id: string;
  contact_phone: string;
  contact_name?: string;
  direction: 'inbound' | 'outbound';
  message_type: 'text' | 'image' | 'audio' | 'document' | 'template';
  body: string;
  media_url?: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: Record<string, any>;
  created_at: string;
}

export type MessageGroup = {
  date: string; // ISO date string for the group label
  messages: WhatsAppMessage[];
};
