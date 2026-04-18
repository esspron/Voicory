export interface CallLog {
  id: string;
  user_id: string;
  assistant_id: string;
  customer_id?: string;
  phone_number: string;
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'missed' | 'failed' | 'in-progress';
  duration_seconds: number;
  cost_usd: number;
  transcript?: string;
  recording_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
  assistant?: { name: string };
  customer?: { name: string };
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone_number: string;
  variables?: Record<string, any>;
  source?: string;
  interaction_count: number;
  last_interaction?: string;
  created_at: string;
}

export interface DashboardStats {
  totalCalls: number;
  avgDuration: number;
  totalCost: number;
  successRate: number;
  creditsBalance: number;
}

export interface CallTranscript {
  id: string;
  call_id: string;
  speaker: 'AI' | 'Caller';
  text: string;
  timestamp_ms?: number;
}

export interface CostBreakdown {
  stt?: number;
  llm?: number;
  tts?: number;
  infra?: number;
}
