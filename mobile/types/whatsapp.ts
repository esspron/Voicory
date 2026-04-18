// WhatsApp types matching exact DB schema

export interface WhatsAppContact {
  id: string;
  config_id: string;
  wa_id: string;
  profile_name?: string;
  phone_number: string;
  customer_id?: string;
  is_opted_in?: boolean;
  last_message_at?: string;
  total_messages?: number;
  total_calls?: number;
}

export interface WhatsAppMessage {
  id: string;
  wa_message_id: string;
  config_id: string;
  from_number: string;
  to_number: string;
  direction: 'inbound' | 'outbound';
  message_type: 'text' | 'image' | 'audio' | 'document' | 'template';
  content?: any; // jsonb field from DB
  status: 'sent' | 'delivered' | 'read' | 'failed';
  is_from_bot?: boolean;
  message_timestamp?: string;
}

export interface WhatsAppConfig {
  id: string;
  // Add config fields as needed based on actual usage
}

export type MessageGroup = {
  date: string; // ISO date string for the group label
  messages: WhatsAppMessage[];
};