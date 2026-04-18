// Types matching exact DB schema

export interface CallLog {
  id: string;
  user_id: string;
  assistant_id: string;
  call_sid?: string;
  phone_number: string;
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'failed' | 'busy' | 'no-answer' | 'in-progress' | 'queued' | 'ringing';
  duration?: string; // Original duration field (may be string)
  conversation_history?: any; // jsonb
  transcript?: string;
  recording_url?: string;
  cost?: number; // numeric type from DB
  metadata?: any; // jsonb
  started_at?: string;
  ended_at?: string;
  created_at: string;
  updated_at?: string;
  provider?: string;
  from_number?: string;
  to_number?: string;
  summary?: string;
  tts_characters?: number;
  stt_minutes?: number;
  phone_number_id?: string;
  duration_seconds?: number;
  assistant?: {
    name: string;
  };
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone_number: string;
  variables?: any; // jsonb
  created_at: string;
  updated_at: string;
  has_memory?: boolean;
  last_interaction?: string;
  interaction_count: number;
  source?: string;
  external_crm_id?: string;
  crm_provider?: string;
  last_synced_at?: string;
}

export interface Assistant {
  id: string;
  user_id: string;
  name: string;
  model?: string;
  voice_id?: string;
  transcriber?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  instruction?: string;
  title?: string;
  first_message?: string;
  llm_provider?: string;
  llm_model?: string;
  temperature?: number;
  max_tokens?: number;
  language?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  organization_name?: string;
  organization_email?: string;
  credits_balance: number;
  plan_type?: string;
  created_at: string;
  updated_at: string;
  country?: string;
  currency?: string;
  currency_symbol?: string;
  paddle_customer_id?: string;
  paddle_subscription_id?: string;
  voice_minutes_used: number;
  voice_minutes_limit: number;
}

export interface PhoneNumber {
  id: string;
  user_id: string;
  number: string;
  provider?: string;
  assistant_id?: string;
  label?: string;
  inbound_enabled: boolean;
  outbound_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface DashboardStats {
  totalCalls: number;
  avgDuration: number;
  totalCost: number;
  successRate: number;
  creditsBalance: number;
}